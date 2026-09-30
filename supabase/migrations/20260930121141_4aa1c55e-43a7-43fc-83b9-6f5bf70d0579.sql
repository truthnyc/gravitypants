DROP POLICY "Anyone sees published reels" ON public.site_reels;
CREATE POLICY "Visitors see published reels" ON public.site_reels FOR SELECT TO anon USING (published);
CREATE POLICY "Signed-in see published reels" ON public.site_reels FOR SELECT TO authenticated USING (published OR public.is_platform_admin());