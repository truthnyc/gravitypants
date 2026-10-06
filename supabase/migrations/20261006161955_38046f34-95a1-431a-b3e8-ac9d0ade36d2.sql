UPDATE public.site_reels s SET brand_id = b.id
FROM public.directory_brands b
WHERE s.brand_id IS NULL AND lower(btrim(s.brand)) = lower(btrim(b.name));