CREATE TABLE public.site_reel_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES public.site_reels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reel_id)
);
GRANT SELECT, INSERT, DELETE ON public.site_reel_favorites TO authenticated;
GRANT ALL ON public.site_reel_favorites TO service_role;
ALTER TABLE public.site_reel_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own site reel favorites read" ON public.site_reel_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own site reel favorites add" ON public.site_reel_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own site reel favorites remove" ON public.site_reel_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);