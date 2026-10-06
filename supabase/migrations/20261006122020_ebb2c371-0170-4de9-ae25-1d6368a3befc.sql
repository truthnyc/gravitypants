DROP POLICY "Public reads visible brands" ON public.directory_brands;
CREATE POLICY "Public reads visible brands" ON public.directory_brands FOR SELECT TO anon, authenticated
USING (public.brand_visible(id) AND (
  EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.brand_id = directory_brands.id AND r.status = 'live')
  OR EXISTS (SELECT 1 FROM public.site_reels s WHERE s.brand_id = directory_brands.id AND s.published)
  OR is_editorial
));