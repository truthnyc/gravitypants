CREATE TABLE public.reel_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.directory_reels(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  price numeric(12,2) CHECK (price IS NULL OR price >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  url text NOT NULL CHECK (url ~ '^https://' AND char_length(url) <= 2000),
  image_path text CHECK (image_path IS NULL OR (image_path ~ '^https://' AND char_length(image_path) <= 2000)),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reel_products_reel_idx ON public.reel_products(reel_id, position);
GRANT SELECT ON public.reel_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reel_products TO authenticated;
GRANT ALL ON public.reel_products TO service_role;
ALTER TABLE public.reel_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads products of live reels" ON public.reel_products FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.id = reel_id AND r.status = 'live' AND public.brand_visible(r.brand_id)));
CREATE POLICY "Owners and admins read products" ON public.reel_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.id = reel_id AND (public.is_brand_member(r.brand_id) OR public.is_platform_admin())));
CREATE POLICY "Owners and admins add products" ON public.reel_products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.id = reel_id AND (public.is_brand_member(r.brand_id) OR public.is_platform_admin())));
CREATE POLICY "Owners and admins edit products" ON public.reel_products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.id = reel_id AND (public.is_brand_member(r.brand_id) OR public.is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.id = reel_id AND (public.is_brand_member(r.brand_id) OR public.is_platform_admin())));
CREATE POLICY "Owners and admins remove products" ON public.reel_products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.id = reel_id AND (public.is_brand_member(r.brand_id) OR public.is_platform_admin())));

CREATE OR REPLACE FUNCTION public.reel_products_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.reel_products WHERE reel_id = NEW.reel_id AND id <> NEW.id) >= 4 THEN
    RAISE EXCEPTION 'A reel can have up to 4 products';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.reel_products_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reel_products_limit BEFORE INSERT OR UPDATE OF reel_id ON public.reel_products FOR EACH ROW EXECUTE FUNCTION public.reel_products_limit();

CREATE TABLE public.product_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.reel_products(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES public.directory_reels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_clicks_product_idx ON public.product_clicks(product_id);
GRANT SELECT ON public.product_clicks TO authenticated;
GRANT ALL ON public.product_clicks TO service_role;
ALTER TABLE public.product_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read clicks" ON public.product_clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.directory_reels r WHERE r.id = reel_id AND (public.is_brand_member(r.brand_id) OR public.is_platform_admin())));