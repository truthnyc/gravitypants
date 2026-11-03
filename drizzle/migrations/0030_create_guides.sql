CREATE TABLE public.guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL,
  seo_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image text,
  moods text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  season text,
  season_label text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.guides.workspace_id IS 'Editorial guides are site-wide; kept for the workspace_id convention.';
GRANT SELECT ON public.guides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT ALL ON public.guides TO service_role;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published guides are public" ON public.guides FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Staff manage guides" ON public.guides FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER guides_updated_at BEFORE UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.guides (slug, title, seo_title, meta_description, intro, moods, categories, season, season_label, start_date, end_date, sections) VALUES
('singles-day', 'Singles'' Day gifts for yourself, by mood', 'Singles'' Day gifts for yourself, by mood — Aimanté', 'Treat yourself this Singles'' Day. Gifts from independent and storied brands, chosen by mood: luxurious, playful, cozy and celebratory.',
E'Singles'' Day falls on November 11. It started as a day for people on their own, and it has become a day to treat yourself.\n\nSo this guide is for you. Pick the mood you want to feel, then find a brand that fits it.\n\nEvery brand here shows itself in a short reel. Watch a few seconds, and follow the ones you love.',
ARRAY['luxurious','playful','cozy','celebratory'], ARRAY['Beauty & Fragrance','Jewelry & Watches','Fashion & Apparel'], 'singles-day', 'Singles'' Day', '2026-10-28', '2026-11-11',
'[{"heading":"Something luxurious","body":"A small luxury you chose yourself feels different. These are pieces to keep.","brands":[{"id":"c16cff11-2cfa-4654-a7dc-bf57434d4ae1","why":"Luminous Paris scents, made for a quiet treat."},{"id":"cffbcd66-8f86-438d-8983-e73ebead93c3","why":"Fine jewelry made to be worn now and passed down later."},{"id":"a0f28054-825c-4cc5-956a-70e78f383fce","why":"Italian cashmere that softens every winter day."}]},{"heading":"Something for every day","body":"Good things you will reach for again and again.","brands":[{"id":"ce56a18c-a4e1-49c1-b2ed-7a77a7768156","why":"Salon-quality hair care with a clean Scandinavian feel."},{"id":"f419e05f-e3ce-4fa2-abef-d1f824435fb1","why":"Simple, well-made shoes for walking the city."}]},{"heading":"Something cozy or sweet","body":"For a slow evening in, on your own terms.","brands":[{"id":"63fac55b-91ac-4546-9825-4da7d76e3cdf","why":"Soft natural-fiber yarn for a new project."},{"id":"42d1a460-b889-47e9-874c-5bdf8a0e6a8e","why":"Chocolate with surprising flavor pairings."},{"id":"d59828e0-1cba-4896-aa04-c30248ea2464","why":"Alcohol-free sparkling wine to toast yourself."}]}]'::jsonb),
('cozy-gifts', 'Cozy gifts from independent brands', 'Cozy gifts from independent brands — Aimanté', 'Warm, soft and slow. Cozy gifts from independent makers and family houses: yarn, wool rugs, bedding, coffee, chocolate and wine.',
E'Cozy is a feeling more than a thing. Soft wool, a warm cup, a good blanket and somewhere to sit.\n\nThese brands make that feeling. Many are small, independent or family-run, and they make things slowly and with care.\n\nWatch their reels, then give someone a slower evening.',
ARRAY['cozy','warm','natural'], ARRAY['Home & Living','Food & Drink','Wine & Spirits'], NULL, NULL, NULL, NULL,
'[{"heading":"Soft things for home","body":"Textiles you want to touch, made to last.","brands":[{"id":"63fac55b-91ac-4546-9825-4da7d76e3cdf","why":"Natural-fiber yarns in soft, painterly colors."},{"id":"d6bc5986-8ac6-4c6e-a17b-9416cf00a762","why":"Handwoven Moroccan rugs in natural wool."},{"id":"fb949ba0-85dc-46cb-aa43-15c4ea4364ef","why":"Silk and linen bedding for slow mornings."},{"id":"237ba165-776e-4c4f-bc31-50015b162e23","why":"Hand-blocked textiles printed on the coast of Maine."}]},{"heading":"Something warm to share","body":"For long dinners and quiet afternoons.","brands":[{"id":"3dfebbea-0e27-45a5-9a88-22cf8e94f04d","why":"A Bologna family roaster, making espresso since 1919."},{"id":"42d1a460-b889-47e9-874c-5bdf8a0e6a8e","why":"Rich chocolate for a night in."},{"id":"7e7c7513-810e-403e-8974-71f0a054ae0c","why":"Classic Bordeaux from a family estate."}]}]'::jsonb),
('holiday-gifts-by-mood', 'Holiday gifts by mood', 'Holiday gifts by mood — Aimanté', 'Find holiday gifts by feeling: festive, warm, elegant and heartfelt. Brands shown in short reels, from independent makers to storied houses.',
E'Holiday gifts are easier when you start with a feeling. Is this person festive, cozy or quietly elegant?\n\nPick the mood that sounds like them. Each brand here shows itself in a short reel, so you can see the gift before you choose.\n\nThe guide stays open all year, and we add to it each season.',
ARRAY['festive','celebratory','warm','elegant','heartfelt'], ARRAY['Food & Drink','Wine & Spirits','Jewelry & Watches','Beauty & Fragrance','Home & Living'], 'holiday', 'the holidays', '2026-11-20', '2026-12-31',
'[{"heading":"Festive","body":"For the table, the toast and the party.","brands":[{"id":"42d1a460-b889-47e9-874c-5bdf8a0e6a8e","why":"Bold chocolate in packaging made to give."},{"id":"d59828e0-1cba-4896-aa04-c30248ea2464","why":"Sparkling and alcohol-free, so everyone can toast."},{"id":"7e7c7513-810e-403e-8974-71f0a054ae0c","why":"Approachable Bordeaux for holiday dinners."}]},{"heading":"Warm","body":"Gifts for slow mornings and long winters.","brands":[{"id":"3dfebbea-0e27-45a5-9a88-22cf8e94f04d","why":"Traditional Italian espresso for winter mornings."},{"id":"63fac55b-91ac-4546-9825-4da7d76e3cdf","why":"Yarn and kits for someone who likes to make."}]},{"heading":"Elegant","body":"Something refined, to keep for years.","brands":[{"id":"cffbcd66-8f86-438d-8983-e73ebead93c3","why":"Fine jewelry made to be treasured."},{"id":"c16cff11-2cfa-4654-a7dc-bf57434d4ae1","why":"Refined Paris fragrance with a luminous feel."},{"id":"a0f28054-825c-4cc5-956a-70e78f383fce","why":"Cashmere from an Italian house founded in 1953."}]},{"heading":"Heartfelt","body":"A gift that helps someone else.","brands":[{"id":"9464f1fc-8994-427e-8c44-d0ff6f20024a","why":"A gift in someone''s name supports emergency medical care."}]}]'::jsonb);