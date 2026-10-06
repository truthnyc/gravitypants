DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='public.directory_brands'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%category%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.directory_brands DROP CONSTRAINT %I', c); END IF;
END $$;
UPDATE public.directory_brands SET category = CASE category
  WHEN 'Fashion' THEN 'Fashion & Apparel' WHEN 'Beauty' THEN 'Beauty & Fragrance' WHEN 'Home' THEN 'Home & Living'
  WHEN 'Travel & Photography' THEN 'Travel & Hospitality' WHEN 'Nonprofits' THEN 'Nonprofit & Causes' ELSE category END;
UPDATE public.directory_brands SET category = 'Arts, Crafts & Hobbies' WHERE name = 'Purl Soho';
ALTER TABLE public.directory_brands ALTER COLUMN category SET DEFAULT 'Other';
ALTER TABLE public.directory_brands ADD CONSTRAINT directory_brands_category_check CHECK (category IN ('Arts, Crafts & Hobbies','Beauty & Fragrance','Events & Entertainment','Fashion & Apparel','Food & Drink','Health & Wellness','Home & Living','Jewelry & Watches','Kids & Family','Nonprofit & Causes','Pets','Real Estate','Restaurants & Cafés','Services & Local Business','Travel & Hospitality','Wine & Spirits','Other'));