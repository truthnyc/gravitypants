-- Products can belong to an editorial website reel (site_reels) instead of a Directory reel; exactly one of the two is set.
ALTER TABLE public.reel_products ADD COLUMN site_reel_id uuid REFERENCES public.site_reels(id) ON DELETE CASCADE;
ALTER TABLE public.reel_products ALTER COLUMN reel_id DROP NOT NULL;
ALTER TABLE public.reel_products ADD CONSTRAINT reel_products_one_reel CHECK (num_nonnulls(reel_id, site_reel_id) = 1);
CREATE INDEX reel_products_site_reel_idx ON public.reel_products(site_reel_id);

-- Clicks on website-reel products.
ALTER TABLE public.product_clicks ADD COLUMN site_reel_id uuid REFERENCES public.site_reels(id) ON DELETE CASCADE;
ALTER TABLE public.product_clicks ALTER COLUMN reel_id DROP NOT NULL;

-- Shoppers read products of published website reels.
CREATE POLICY "Public reads products of published site reels" ON public.reel_products FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM site_reels s WHERE s.id = reel_products.site_reel_id AND s.published));

-- Admins manage website-reel products (brand members only ever own Directory reels).
DROP POLICY "Owners and admins add products" ON public.reel_products;
CREATE POLICY "Owners and admins add products" ON public.reel_products FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM directory_reels r WHERE r.id = reel_products.reel_id AND (is_brand_member(r.brand_id) OR is_platform_admin())))
    OR (reel_products.site_reel_id IS NOT NULL AND is_platform_admin()));
DROP POLICY "Owners and admins edit products" ON public.reel_products;
CREATE POLICY "Owners and admins edit products" ON public.reel_products FOR UPDATE TO authenticated
  USING ((EXISTS (SELECT 1 FROM directory_reels r WHERE r.id = reel_products.reel_id AND (is_brand_member(r.brand_id) OR is_platform_admin())))
    OR (reel_products.site_reel_id IS NOT NULL AND is_platform_admin()))
  WITH CHECK ((EXISTS (SELECT 1 FROM directory_reels r WHERE r.id = reel_products.reel_id AND (is_brand_member(r.brand_id) OR is_platform_admin())))
    OR (reel_products.site_reel_id IS NOT NULL AND is_platform_admin()));
DROP POLICY "Owners and admins remove products" ON public.reel_products;
CREATE POLICY "Owners and admins remove products" ON public.reel_products FOR DELETE TO authenticated
  USING ((EXISTS (SELECT 1 FROM directory_reels r WHERE r.id = reel_products.reel_id AND (is_brand_member(r.brand_id) OR is_platform_admin())))
    OR (reel_products.site_reel_id IS NOT NULL AND is_platform_admin()));
DROP POLICY "Owners and admins read products" ON public.reel_products;
CREATE POLICY "Owners and admins read products" ON public.reel_products FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM directory_reels r WHERE r.id = reel_products.reel_id AND (is_brand_member(r.brand_id) OR is_platform_admin())))
    OR (reel_products.site_reel_id IS NOT NULL AND is_platform_admin()));
DROP POLICY "Owners and admins read clicks" ON public.product_clicks;
CREATE POLICY "Owners and admins read clicks" ON public.product_clicks FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM directory_reels r WHERE r.id = product_clicks.reel_id AND (is_brand_member(r.brand_id) OR is_platform_admin())))
    OR (product_clicks.site_reel_id IS NOT NULL AND is_platform_admin()));