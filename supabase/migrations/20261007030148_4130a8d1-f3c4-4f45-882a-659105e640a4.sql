CREATE OR REPLACE FUNCTION public.approve_brand_request(_request_id uuid, _admin_id uuid, _admin_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.brand_requests%ROWTYPE;
  new_brand_id uuid;
  new_workspace_id uuid;
  new_slug text;
  base_slug text;
  suffix integer := 1;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
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

  INSERT INTO public.workspaces(name, owner_id)
  VALUES ('Editorial · ' || req.brand, NULL)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.directory_brands (
    workspace_id, name, website_url, category, description, logo_url, slug,
    is_editorial, moods, affiliated, status
  ) VALUES (
    new_workspace_id, req.brand, req.website, req.category, req.description, req.logo_url, new_slug,
    true, req.moods, false, 'draft'
  ) RETURNING id INTO new_brand_id;

  UPDATE public.brand_requests SET status='approved', admin_note=_admin_note,
    reviewed_at=now(), reviewed_by=_admin_id, created_brand_id=new_brand_id
  WHERE id=_request_id;

  INSERT INTO public.admin_audit_log(admin_user_id, action, workspace_id, target, reason)
  VALUES (_admin_id, 'brand_request.approve', new_workspace_id, 'brand_request:' || _request_id::text, _admin_note);
  RETURN new_brand_id;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_brand_request(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_brand_request(uuid,uuid,text) TO service_role;