ALTER TABLE public.directory_brands
  DROP CONSTRAINT IF EXISTS directory_brands_name_check,
  DROP CONSTRAINT IF EXISTS directory_brands_description_check,
  DROP CONSTRAINT IF EXISTS directory_brands_slug_check;

ALTER TABLE public.directory_brands
  ADD CONSTRAINT directory_brands_name_check CHECK (char_length(name) BETWEEN 1 AND 50),
  ADD CONSTRAINT directory_brands_description_check CHECK (description IS NULL OR char_length(description) <= 300),
  ADD CONSTRAINT directory_brands_slug_check CHECK (slug ~ '^[a-z0-9-]{3,30}$' AND slug NOT IN ('directory','admin','search','new','edit','api','app'));

ALTER TABLE public.directory_reels
  ADD COLUMN description text;

ALTER TABLE public.directory_reels
  ADD CONSTRAINT directory_reels_description_check CHECK (description IS NULL OR char_length(description) <= 120);

CREATE OR REPLACE FUNCTION public.slug_status(_slug text, _brand uuid DEFAULT NULL) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _slug !~ '^[a-z0-9-]{3,30}$' THEN 'invalid'
    WHEN _slug IN ('directory','admin','search','new','edit','api','app') THEN 'reserved'
    WHEN EXISTS (SELECT 1 FROM public.directory_brands WHERE slug = _slug AND id = _brand) THEN 'yours'
    WHEN EXISTS (SELECT 1 FROM public.directory_brands WHERE slug = _slug) THEN 'taken'
    WHEN EXISTS (SELECT 1 FROM public.directory_slug_history WHERE old_slug = _slug AND changed_at > now() - interval '12 months'
      AND brand_id IS DISTINCT FROM _brand) THEN 'taken'
    ELSE 'available' END
$$;