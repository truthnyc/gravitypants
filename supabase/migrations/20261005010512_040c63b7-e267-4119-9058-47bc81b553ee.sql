CREATE TABLE public.directory_likes (
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('reel','brand')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
GRANT SELECT, INSERT, DELETE ON public.directory_likes TO authenticated;
GRANT ALL ON public.directory_likes TO service_role;
ALTER TABLE public.directory_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own likes read" ON public.directory_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own likes add" ON public.directory_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own likes remove" ON public.directory_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX directory_likes_target ON public.directory_likes (target_type, target_id);

CREATE TABLE public.directory_reel_favorites (
  user_id uuid NOT NULL,
  reel_id uuid NOT NULL REFERENCES public.directory_reels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reel_id)
);
GRANT SELECT, INSERT, DELETE ON public.directory_reel_favorites TO authenticated;
GRANT ALL ON public.directory_reel_favorites TO service_role;
ALTER TABLE public.directory_reel_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reel favs read" ON public.directory_reel_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reel favs add" ON public.directory_reel_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reel favs remove" ON public.directory_reel_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.favorite_pages (
  user_id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,30}$'),
  title text CHECK (char_length(title) <= 60),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_pages TO authenticated;
GRANT ALL ON public.favorite_pages TO service_role;
ALTER TABLE public.favorite_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fav page" ON public.favorite_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER favorite_pages_updated BEFORE UPDATE ON public.favorite_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.directory_like_counts(_ids uuid[])
RETURNS TABLE(target_id uuid, likes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.target_id, count(*) FROM public.directory_likes l WHERE l.target_id = ANY(_ids) GROUP BY l.target_id
$$;
GRANT EXECUTE ON FUNCTION public.directory_like_counts(uuid[]) TO anon, authenticated;