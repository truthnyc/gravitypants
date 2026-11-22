CREATE TABLE IF NOT EXISTS public.category_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL, entity_id uuid NOT NULL, category text, category_id uuid, extra jsonb,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.category_backup TO service_role;
ALTER TABLE public.category_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read category backup" ON public.category_backup FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.category_backup TO authenticated;

INSERT INTO public.category_backup (entity, entity_id, category, category_id, extra)
  SELECT 'brand', id, category, category_id, jsonb_build_object('status', status) FROM public.directory_brands;
INSERT INTO public.category_backup (entity, entity_id, category) SELECT 'site_reel', id, category FROM public.site_reels;
INSERT INTO public.category_backup (entity, entity_id, category) SELECT 'brand_request', id, category FROM public.brand_requests;
INSERT INTO public.category_backup (entity, entity_id, extra) SELECT 'guide', id, to_jsonb(categories) FROM public.guides;
INSERT INTO public.category_backup (entity, entity_id, category, extra) SELECT 'category', id, name, jsonb_build_object('slug', slug, 'sort_order', sort_order) FROM public.categories;
INSERT INTO public.category_backup (entity, entity_id, extra) SELECT 'site_setting', gen_random_uuid(), jsonb_build_object('key', key, 'value', value) FROM public.site_settings WHERE key = 'directory_greeting';

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','admin','retired'));
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id);
ALTER TABLE public.directory_brands ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.categories(id);

CREATE TABLE IF NOT EXISTS public.category_slug_aliases (old_slug text PRIMARY KEY, new_slug text NOT NULL);
GRANT SELECT ON public.category_slug_aliases TO anon, authenticated;
GRANT ALL ON public.category_slug_aliases TO service_role;
ALTER TABLE public.category_slug_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads category aliases" ON public.category_slug_aliases FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.category_slug_aliases VALUES
 ('fashion-apparel','fashion'),('crafts-hobbies','crafts-making'),('health-wellness','wellness'),
 ('services-local-business','local-services'),('travel-hospitality','travel-stays'),
 ('photography-visual-arts','art-photography'),('nonprofit-causes','nonprofit-events'),
 ('events-entertainment','nonprofit-events'),('restaurants-cafes','food-drink'),('wine-spirits','food-drink')
ON CONFLICT (old_slug) DO NOTHING;

CREATE TEMP TABLE cat_map (old text PRIMARY KEY, new text NOT NULL) ON COMMIT DROP;
INSERT INTO cat_map VALUES
 ('Fashion & Apparel','Fashion'),('Crafts & Hobbies','Crafts & Making'),('Health & Wellness','Wellness'),
 ('Services & Local Business','Local Services'),('Travel & Hospitality','Travel & Stays'),
 ('Photography & Visual Arts','Art & Photography'),('Nonprofit & Causes','Nonprofit & Events'),
 ('Events & Entertainment','Nonprofit & Events'),('Restaurants & Cafés','Food & Drink'),('Wine & Spirits','Food & Drink');

ALTER TABLE public.directory_brands DROP CONSTRAINT IF EXISTS directory_brands_category_check;

-- Rename category rows in place (keeps ids, intros and links).
UPDATE public.categories c SET name = m.new, slug = public.category_slug(m.new)
  FROM cat_map m WHERE c.name = m.old AND m.old NOT IN ('Events & Entertainment','Restaurants & Cafés','Wine & Spirits');
UPDATE public.categories SET page_intro = replace(replace(replace(replace(replace(replace(replace(page_intro,
  'fashion & apparel','fashion'),'crafts & hobbies','crafts & making'),'health & wellness','wellness'),'services & local business','local services'),
  'travel & hospitality','travel & stays'),'photography & visual arts','art & photography'),'nonprofit & causes','nonprofit & events');
INSERT INTO public.categories (name, slug, hint) VALUES
 ('Sports & Outdoor','sports-outdoor','Activewear, outdoor gear, bikes, sailing'),
 ('Fashion','fashion','Clothing, shoes, bags, knitwear'),('Crafts & Making','crafts-making','Yarn, craft supplies, handmade goods'),
 ('Wellness','wellness','Supplements, fitness, spas, yoga'),('Local Services','local-services','Salons, studios, agencies, shops'),
 ('Travel & Stays','travel-stays','Hotels, villas, tours, destinations'),('Art & Photography','art-photography','Photography, galleries, artists'),
 ('Nonprofit & Events','nonprofit-events','Charities, causes, venues, festivals')
ON CONFLICT (name) DO NOTHING;
UPDATE public.categories SET visibility = 'retired', parent_id = (SELECT id FROM public.categories WHERE name = 'Nonprofit & Events') WHERE name = 'Events & Entertainment';
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE name = 'Food & Drink'), sort_order = 100 WHERE name IN ('Restaurants & Cafés','Wine & Spirits');
INSERT INTO public.categories (name, slug, hint, parent_id, sort_order)
  SELECT v.n, public.category_slug(v.n), '', p.id, 100 FROM (VALUES ('Menswear','Fashion'),('Womenswear','Fashion'),('Knitwear','Fashion'),('Shoes & Bags','Fashion'),('Accessories','Fashion'),('Producers','Food & Drink')) v(n, parent)
  JOIN public.categories p ON p.name = v.parent ON CONFLICT (name) DO NOTHING;
UPDATE public.categories SET visibility = 'admin' WHERE name IN ('Real Estate','Other');
UPDATE public.categories c SET sort_order = o.ord FROM (VALUES ('Fashion',1),('Sports & Outdoor',2),('Jewelry & Watches',3),('Beauty & Fragrance',4),('Home & Living',5),
 ('Crafts & Making',6),('Food & Drink',7),('Wellness',8),('Travel & Stays',9),('Kids & Family',10),('Pets',11),('Art & Photography',12),('Local Services',13),('Nonprofit & Events',14),('Real Estate',90),('Other',99)) o(n, ord)
 WHERE c.name = o.n;

-- Brands: Wine & Spirits keeps its subcategory; everything else just takes the new name.
UPDATE public.directory_brands b SET subcategory_id = (SELECT id FROM public.categories WHERE name = b.category) WHERE b.category IN ('Wine & Spirits','Restaurants & Cafés');
UPDATE public.directory_brands b SET category = m.new FROM cat_map m WHERE b.category = m.old;
UPDATE public.directory_brands SET category = 'Crafts & Making' WHERE slug = 'purl-soho';
UPDATE public.directory_brands SET status = 'draft' WHERE slug = 'test' AND name = 'test';
UPDATE public.directory_brands b SET category_id = c.id FROM public.categories c WHERE c.name = b.category AND b.category_id IS DISTINCT FROM c.id;

ALTER TABLE public.directory_brands ADD CONSTRAINT directory_brands_category_check CHECK (category = ANY (ARRAY['Fashion','Sports & Outdoor','Jewelry & Watches','Beauty & Fragrance','Home & Living','Crafts & Making','Food & Drink','Wellness','Travel & Stays','Kids & Family','Pets','Art & Photography','Local Services','Nonprofit & Events','Real Estate','Other']));

UPDATE public.site_reels s SET category = m.new FROM cat_map m WHERE s.category = m.old;
UPDATE public.site_reels s SET category = b.category FROM public.directory_brands b WHERE s.brand_id = b.id AND b.slug = 'purl-soho';
UPDATE public.brand_requests r SET category = m.new FROM cat_map m WHERE r.category = m.old;
UPDATE public.guides g SET categories = array(SELECT DISTINCT coalesce(m.new, x) FROM unnest(g.categories) x LEFT JOIN cat_map m ON m.old = x);

-- Moods per category: carry merged categories' moods into their new home.
INSERT INTO public.category_moods (category, mood_id, category_id)
  SELECT m.new, cm.mood_id, (SELECT id FROM public.categories WHERE name = m.new) FROM public.category_moods cm JOIN cat_map m ON m.old = cm.category
  ON CONFLICT DO NOTHING;
UPDATE public.category_moods cm SET category_id = c.id FROM public.categories c WHERE c.name = cm.category AND cm.category_id IS DISTINCT FROM c.id;

UPDATE public.site_settings SET value = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(value::text,
 '"Fashion & Apparel"','"Fashion"'),'"Crafts & Hobbies"','"Crafts & Making"'),'"Health & Wellness"','"Wellness"'),'"Services & Local Business"','"Local Services"'),
 '"Travel & Hospitality"','"Travel & Stays"'),'"Photography & Visual Arts"','"Art & Photography"'),'"Nonprofit & Causes"','"Nonprofit & Events"'),
 '"Events & Entertainment"','"Nonprofit & Events"'),'"Restaurants & Cafés"','"Food & Drink"'),'"Wine & Spirits"','"Food & Drink"')::jsonb
 WHERE key IN ('directory_greeting','directory');