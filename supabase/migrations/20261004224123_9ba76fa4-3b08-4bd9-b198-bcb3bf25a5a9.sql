CREATE TABLE public.directory_favorites (
  user_id uuid NOT NULL,
  brand_id uuid NOT NULL REFERENCES public.directory_brands(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);
GRANT SELECT, INSERT, DELETE ON public.directory_favorites TO authenticated;
GRANT ALL ON public.directory_favorites TO service_role;
ALTER TABLE public.directory_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own favorites" ON public.directory_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own favorites" ON public.directory_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own favorites" ON public.directory_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());