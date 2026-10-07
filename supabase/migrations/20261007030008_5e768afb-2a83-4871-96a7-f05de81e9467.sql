ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS moods text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_brand_id uuid REFERENCES public.directory_brands(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.brand_requests
  DROP CONSTRAINT IF EXISTS brand_requests_status_check;
ALTER TABLE public.brand_requests
  ADD CONSTRAINT brand_requests_status_check CHECK (status IN ('pending','approved','declined'));
ALTER TABLE public.brand_requests
  DROP CONSTRAINT IF EXISTS brand_requests_moods_limit;
ALTER TABLE public.brand_requests
  ADD CONSTRAINT brand_requests_moods_limit CHECK (cardinality(moods) BETWEEN 1 AND 3);
ALTER TABLE public.brand_requests
  DROP CONSTRAINT IF EXISTS brand_requests_created_brand_unique;
ALTER TABLE public.brand_requests
  ADD CONSTRAINT brand_requests_created_brand_unique UNIQUE (created_brand_id);

GRANT INSERT ON public.brand_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.brand_requests TO authenticated;
GRANT ALL ON public.brand_requests TO service_role;

DROP POLICY IF EXISTS "Admins read brand requests" ON public.brand_requests;
DROP POLICY IF EXISTS "Admins update brand requests" ON public.brand_requests;
CREATE POLICY "Admins read brand requests" ON public.brand_requests
  FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins update brand requests" ON public.brand_requests
  FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.set_brand_request_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS set_brand_request_updated_at ON public.brand_requests;
CREATE TRIGGER set_brand_request_updated_at
BEFORE UPDATE ON public.brand_requests
FOR EACH ROW EXECUTE FUNCTION public.set_brand_request_updated_at();

CREATE OR REPLACE FUNCTION public.approve_brand_request(_request_id uuid, _admin_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.brand_requests%ROWTYPE;
  new_brand_id uuid;
  new_slug text;
  base_slug text;
  suffix integer := 1;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO req FROM public.brand_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF req.status = 'approved' AND req.created_brand_id IS NOT NULL THEN RETURN req.created_brand_id; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Application has already been reviewed'; END IF;
  IF req.category IS NULL OR req.description IS NULL OR cardinality(req.moods) < 1 THEN RAISE EXCEPTION 'Application profile is incomplete'; END IF;

  base_slug := trim(both '-' from regexp_replace(lower(unaccent(req.brand)), '[^a-z0-9]+', '-', 'g'));
  IF length(base_slug) < 3 THEN base_slug := 'brand'; END IF;
  new_slug := left(base_slug, 30);
  WHILE EXISTS (SELECT 1 FROM public.directory_brands WHERE slug = new_slug)
     OR EXISTS (SELECT 1 FROM public.directory_slug_history WHERE old_slug = new_slug) LOOP
    suffix := suffix + 1;
    new_slug := left(base_slug, 30 - length(suffix::text) - 1) || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.directory_brands (
    workspace_id, name, website_url, category, description, logo_url, slug,
    is_editorial, moods, affiliated, status
  ) VALUES (
    (SELECT id FROM public.workspaces ORDER BY created_at LIMIT 1),
    req.brand, req.website, req.category, req.description, req.logo_url, new_slug,
    true, req.moods, false, 'draft'
  ) RETURNING id INTO new_brand_id;

  UPDATE public.brand_requests SET status='approved', admin_note=_admin_note,
    reviewed_at=now(), reviewed_by=auth.uid(), created_brand_id=new_brand_id
  WHERE id=_request_id;

  INSERT INTO public.admin_audit_log(admin_user_id, action, target, reason)
  VALUES (auth.uid(), 'brand_request.approve', 'brand_request:' || _request_id::text, _admin_note);
  RETURN new_brand_id;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_brand_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_brand_request(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decline_brand_request(_request_id uuid, _admin_note text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(trim(coalesce(_admin_note,''))) < 2 THEN RAISE EXCEPTION 'Add a short reason'; END IF;
  UPDATE public.brand_requests SET status='declined', admin_note=_admin_note,
    reviewed_at=now(), reviewed_by=auth.uid()
  WHERE id=_request_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Application is unavailable or already reviewed'; END IF;
  INSERT INTO public.admin_audit_log(admin_user_id, action, target, reason)
  VALUES (auth.uid(), 'brand_request.decline', 'brand_request:' || _request_id::text, _admin_note);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.decline_brand_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_brand_request(uuid,text) TO authenticated, service_role;