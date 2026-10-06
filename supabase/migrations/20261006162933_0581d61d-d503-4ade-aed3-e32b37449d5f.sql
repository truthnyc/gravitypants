CREATE TABLE public.directory_featured_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('directory','site')),
  position integer NOT NULL DEFAULT 0,
  week_of date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX directory_featured_reels_week ON public.directory_featured_reels (week_of, position);
GRANT SELECT ON public.directory_featured_reels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.directory_featured_reels TO authenticated;
GRANT ALL ON public.directory_featured_reels TO service_role;
ALTER TABLE public.directory_featured_reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read featured picks" ON public.directory_featured_reels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage featured picks" ON public.directory_featured_reels FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.directory_reel_save_counts(_ids uuid[]) RETURNS TABLE(reel_id uuid, saves bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select id, count(*) from (
    select reel_id id from directory_reel_favorites where reel_id = any(_ids)
    union all select reel_id from site_reel_favorites where reel_id = any(_ids)
  ) t group by id
$$;
REVOKE EXECUTE ON FUNCTION public.directory_reel_save_counts(uuid[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.directory_reel_save_counts(uuid[]) TO service_role;