CREATE TABLE public.moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name = lower(name) AND char_length(name) BETWEEN 2 AND 30),
  family text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.category_moods (
  category text NOT NULL,
  mood_id uuid NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (category, mood_id)
);
GRANT SELECT ON public.moods, public.category_moods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.moods, public.category_moods TO authenticated;
GRANT ALL ON public.moods, public.category_moods TO service_role;
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_moods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read moods" ON public.moods FOR SELECT USING (true);
CREATE POLICY "Admins manage moods" ON public.moods FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Anyone can read category moods" ON public.category_moods FOR SELECT USING (true);
CREATE POLICY "Admins manage category moods" ON public.category_moods FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

INSERT INTO public.moods (name, family, sort_order)
SELECT m, f, row_number() OVER () FROM (VALUES
 ('soothing','Calm'),('serene','Calm'),('calm','Calm'),('minimal','Calm'),('airy','Calm'),('dreamy','Calm'),
 ('luxurious','Luxe'),('elegant','Luxe'),('refined','Luxe'),('timeless','Luxe'),('sophisticated','Luxe'),('opulent','Luxe'),
 ('cozy','Warm'),('warm','Warm'),('rustic','Warm'),('nostalgic','Warm'),('heritage','Warm'),('homey','Warm'),
 ('bold','Energetic'),('energetic','Energetic'),('urgent','Energetic'),('punchy','Energetic'),('vibrant','Energetic'),('dynamic','Energetic'),
 ('playful','Playful'),('fun','Playful'),('quirky','Playful'),('whimsical','Playful'),('cheerful','Playful'),
 ('natural','Natural'),('earthy','Natural'),('fresh','Natural'),('organic','Natural'),('coastal','Natural'),('sunny','Natural'),
 ('romantic','Romantic'),('sensual','Romantic'),('intimate','Romantic'),('soft','Romantic'),
 ('moody','Dramatic'),('dramatic','Dramatic'),('cinematic','Dramatic'),('mysterious','Dramatic'),('dark','Dramatic'),
 ('modern','Modern'),('sleek','Modern'),('clean','Modern'),('edgy','Modern'),('futuristic','Modern'),('urban','Modern'),
 ('heartfelt','Heartfelt'),('hopeful','Heartfelt'),('inspiring','Heartfelt'),('empowering','Heartfelt'),('human','Heartfelt'),('trustworthy','Heartfelt'),
 ('festive','Festive'),('celebratory','Festive'),('indulgent','Festive')
) v(m,f);

INSERT INTO public.category_moods (category, mood_id, sort_order)
SELECT c.category, mo.id, c.ord FROM (
  SELECT cat AS category, m, ord FROM (VALUES
   ('Fashion & Apparel', ARRAY['elegant','luxurious','bold','edgy','minimal','urban','timeless','playful','moody','romantic']),
   ('Jewelry & Watches', ARRAY['elegant','luxurious','timeless','romantic','refined','opulent','minimal','sophisticated','festive']),
   ('Beauty & Fragrance', ARRAY['luxurious','sensual','soothing','fresh','clean','dreamy','elegant','mysterious','soft','bold']),
   ('Health & Wellness', ARRAY['soothing','calm','fresh','natural','energetic','empowering','clean','serene','organic']),
   ('Food & Drink', ARRAY['indulgent','warm','cozy','fresh','playful','rustic','heritage','vibrant','festive','homey']),
   ('Wine & Spirits', ARRAY['elegant','rustic','heritage','warm','sophisticated','moody','celebratory','timeless','earthy']),
   ('Restaurants & Cafés', ARRAY['cozy','warm','vibrant','urban','rustic','indulgent','fresh','homey','fun']),
   ('Home & Living', ARRAY['cozy','serene','minimal','warm','refined','natural','earthy','timeless','homey','airy']),
   ('Travel & Hospitality', ARRAY['serene','coastal','sunny','dreamy','luxurious','cinematic','romantic','airy','natural']),
   ('Real Estate', ARRAY['elegant','modern','airy','serene','luxurious','sleek','warm','trustworthy','coastal']),
   ('Arts, Crafts & Hobbies', ARRAY['cozy','playful','whimsical','natural','nostalgic','calm','vibrant','homey','inspiring']),
   ('Kids & Family', ARRAY['playful','cheerful','fun','whimsical','soft','warm','sunny','heartfelt']),
   ('Pets', ARRAY['playful','cheerful','fun','heartfelt','warm','quirky','cozy','sunny']),
   ('Events & Entertainment', ARRAY['energetic','bold','festive','celebratory','urgent','cinematic','dramatic','vibrant','fun']),
   ('Services & Local Business', ARRAY['trustworthy','clean','modern','warm','cheerful','bold','minimal','human']),
   ('Nonprofit & Causes', ARRAY['heartfelt','hopeful','inspiring','human','urgent','empowering','trustworthy','calm'])
  ) x(cat, arr), unnest(arr) WITH ORDINALITY u(m, ord)
) c JOIN public.moods mo ON mo.name = c.m;

-- Older reels used "energizing"; map to the master mood "energetic".
UPDATE public.directory_reels SET moods = array_replace(moods, 'energizing', 'energetic') WHERE 'energizing' = ANY(moods);
UPDATE public.directory_brands SET moods = array_replace(moods, 'energizing', 'energetic') WHERE 'energizing' = ANY(moods);