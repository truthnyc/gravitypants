-- 1. Categories (17 + Other) with a one-line hint
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  hint text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

INSERT INTO public.categories (name, slug, hint, sort_order) VALUES
 ('Beauty & Fragrance','beauty-fragrance','Skincare, makeup, perfume, hair',1),
 ('Crafts & Hobbies','crafts-hobbies','Yarn, craft supplies, handmade goods, hobbies',2),
 ('Events & Entertainment','events-entertainment','Venues, concerts, festivals, weddings',3),
 ('Fashion & Apparel','fashion-apparel','Clothing, shoes, bags, knitwear',4),
 ('Food & Drink','food-drink','Chocolate, coffee, bakeries, packaged food',5),
 ('Health & Wellness','health-wellness','Supplements, fitness, spas, yoga',6),
 ('Home & Living','home-living','Furniture, decor, textiles, candles',7),
 ('Jewelry & Watches','jewelry-watches','Fine jewelry, watches, accessories',8),
 ('Kids & Family','kids-family','Toys, baby goods, children''s fashion',9),
 ('Nonprofit & Causes','nonprofit-causes','Charities, NGOs, fundraisers',10),
 ('Pets','pets','Pet food, accessories, grooming',11),
 ('Photography & Visual Arts','photography-visual-arts','Photography, galleries, artists, visual art',12),
 ('Real Estate','real-estate','Listings, developments, agents',13),
 ('Restaurants & Cafés','restaurants-cafes','Menus, specials, openings',14),
 ('Services & Local Business','services-local-business','Salons, studios, agencies, shops',15),
 ('Travel & Hospitality','travel-hospitality','Hotels, villas, tours, destinations',16),
 ('Wine & Spirits','wine-spirits','Wineries, breweries, distilleries',17),
 ('Other','other','Everything else',99);

-- 2. Mood families
CREATE TABLE public.mood_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mood_families TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mood_families TO authenticated;
GRANT ALL ON public.mood_families TO service_role;
ALTER TABLE public.mood_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads mood families" ON public.mood_families FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage mood families" ON public.mood_families FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

INSERT INTO public.mood_families (name, sort_order) VALUES
 ('Calm',1),('Luxe',2),('Warm',3),('Energetic',4),('Playful',5),('Natural',6),
 ('Romantic',7),('Dramatic',8),('Modern',9),('Heartfelt',10),('Festive',11);

-- 3. Link existing moods to their family
ALTER TABLE public.moods ADD COLUMN family_id uuid REFERENCES public.mood_families(id);
UPDATE public.moods m SET family_id = f.id FROM public.mood_families f WHERE f.name = m.family;

-- 4. Link the moods each category shows to the category row; add Photography & Visual Arts
ALTER TABLE public.category_moods ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;
INSERT INTO public.category_moods (category, mood_id, sort_order)
SELECT 'Photography & Visual Arts', m.id, x.ord
FROM unnest(array['Cinematic','Serene','Moody','Dramatic','Minimal','Inspiring','Timeless','Coastal','Dreamy']) WITH ORDINALITY x(name, ord)
JOIN public.moods m ON lower(m.name) = lower(x.name)
WHERE NOT EXISTS (SELECT 1 FROM public.category_moods c WHERE c.category = 'Photography & Visual Arts' AND c.mood_id = m.id);
UPDATE public.category_moods cm SET category_id = c.id FROM public.categories c WHERE c.name = cm.category;

-- 5. Brands: category link, affiliated, draft/live
ALTER TABLE public.directory_brands
  ADD COLUMN category_id uuid REFERENCES public.categories(id),
  ADD COLUMN affiliated boolean NOT NULL DEFAULT false,
  ADD COLUMN status text NOT NULL DEFAULT 'live' CHECK (status IN ('draft','live'));
UPDATE public.directory_brands b SET category_id = c.id FROM public.categories c WHERE c.name = b.category;

-- Draft brands are never public
CREATE OR REPLACE FUNCTION public.brand_visible(_brand uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select coalesce(status = 'live' and (is_editorial or public.directory_effective_plan(workspace_id) is not null
    or (plan_ended_at is not null and plan_ended_at > now() - interval '30 days')), false)
  from public.directory_brands where id = _brand
$$;

-- 6. Brand moods (1-3 per brand)
CREATE TABLE public.brand_moods (
  brand_id uuid NOT NULL REFERENCES public.directory_brands(id) ON DELETE CASCADE,
  mood_id uuid NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, mood_id)
);
GRANT SELECT ON public.brand_moods TO anon, authenticated;
GRANT INSERT, DELETE ON public.brand_moods TO authenticated;
GRANT ALL ON public.brand_moods TO service_role;
ALTER TABLE public.brand_moods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads moods of live brands" ON public.brand_moods FOR SELECT TO anon, authenticated USING (public.brand_visible(brand_id));
CREATE POLICY "Owners read own brand moods" ON public.brand_moods FOR SELECT TO authenticated USING (public.is_brand_member(brand_id) OR public.is_platform_admin());
CREATE POLICY "Owners add own brand moods" ON public.brand_moods FOR INSERT TO authenticated WITH CHECK (public.is_brand_member(brand_id) OR public.is_platform_admin());
CREATE POLICY "Owners remove own brand moods" ON public.brand_moods FOR DELETE TO authenticated USING (public.is_brand_member(brand_id) OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.brand_moods_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if (select count(*) from public.brand_moods where brand_id = new.brand_id) >= 3 then
    raise exception 'A brand can have up to 3 moods';
  end if;
  return new;
end $$;
CREATE TRIGGER brand_moods_limit BEFORE INSERT ON public.brand_moods FOR EACH ROW EXECUTE FUNCTION public.brand_moods_limit();

INSERT INTO public.brand_moods (brand_id, mood_id)
SELECT b.id, m.id FROM public.directory_brands b
CROSS JOIN LATERAL (SELECT x, ord FROM unnest(b.moods) WITH ORDINALITY u(x, ord) WHERE ord <= 3) t
JOIN public.moods m ON lower(m.name) = lower(t.x)
ON CONFLICT DO NOTHING;