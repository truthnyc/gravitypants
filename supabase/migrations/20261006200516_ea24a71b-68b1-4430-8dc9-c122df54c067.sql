CREATE TABLE public.directory_reel_views (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('directory', 'site')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.directory_reel_views TO authenticated;
GRANT ALL ON public.directory_reel_views TO service_role;
ALTER TABLE public.directory_reel_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read reel opens" ON public.directory_reel_views FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE INDEX directory_reel_views_week_idx ON public.directory_reel_views (created_at, kind, reel_id);

CREATE FUNCTION public.record_directory_reel_open(_event_id uuid, _reel_id uuid, _kind text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  IF _kind = 'directory' THEN
    SELECT b.workspace_id INTO ws FROM public.directory_reels r JOIN public.directory_brands b ON b.id = r.brand_id
    WHERE r.id = _reel_id AND r.status = 'live' AND public.brand_visible(b.id);
  ELSIF _kind = 'site' THEN
    SELECT b.workspace_id INTO ws FROM public.site_reels r JOIN public.directory_brands b ON b.id = r.brand_id
    WHERE r.id = _reel_id AND r.published AND public.brand_visible(b.id);
  ELSE
    RETURN false;
  END IF;
  IF ws IS NULL OR _event_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.directory_reel_views (id, workspace_id, reel_id, kind) VALUES (_event_id, ws, _reel_id, _kind) ON CONFLICT (id) DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.record_directory_reel_open(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_directory_reel_open(uuid, uuid, text) TO anon, authenticated, service_role;

CREATE FUNCTION public.directory_reel_weekly_views(_ids uuid[])
RETURNS TABLE (reel_id uuid, kind text, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.reel_id, v.kind, count(*) AS views
  FROM public.directory_reel_views v
  WHERE v.reel_id = ANY(_ids)
    AND cardinality(_ids) <= 240
    AND v.created_at >= (date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
    AND v.created_at < (date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + interval '7 days'
    AND ((v.kind = 'directory' AND EXISTS (
      SELECT 1 FROM public.directory_reels r WHERE r.id = v.reel_id AND r.status = 'live' AND public.brand_visible(r.brand_id)
    )) OR (v.kind = 'site' AND EXISTS (
      SELECT 1 FROM public.site_reels r WHERE r.id = v.reel_id AND r.published AND public.brand_visible(r.brand_id)
    )))
  GROUP BY v.reel_id, v.kind;
$$;
REVOKE ALL ON FUNCTION public.directory_reel_weekly_views(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.directory_reel_weekly_views(uuid[]) TO anon, authenticated, service_role;