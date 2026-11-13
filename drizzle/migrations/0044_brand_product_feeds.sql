CREATE TABLE public.brand_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL UNIQUE REFERENCES public.directory_brands(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'feed' CHECK (type IN ('feed')),
  feed_url text NOT NULL CHECK (feed_url ~ '^https://' AND char_length(feed_url) <= 2000),
  status text NOT NULL DEFAULT 'syncing' CHECK (status IN ('ok','error','syncing')),
  last_synced_at timestamptz,
  last_error text,
  product_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_sources TO authenticated;
GRANT ALL ON public.brand_sources TO service_role;
ALTER TABLE public.brand_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members and admins manage feed" ON public.brand_sources FOR ALL TO authenticated
  USING (public.is_brand_member(brand_id) OR public.is_platform_admin())
  WITH CHECK (public.is_brand_member(brand_id) OR public.is_platform_admin());

CREATE TABLE public.brand_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.brand_sources(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.directory_brands(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  price numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  url text NOT NULL,
  image_url text,
  availability text NOT NULL DEFAULT 'unknown' CHECK (availability IN ('in_stock','out_of_stock','unknown')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);
CREATE INDEX brand_catalog_brand_idx ON public.brand_catalog(brand_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_catalog TO authenticated;
GRANT ALL ON public.brand_catalog TO service_role;
ALTER TABLE public.brand_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members and admins manage catalogue" ON public.brand_catalog FOR ALL TO authenticated
  USING (public.is_brand_member(brand_id) OR public.is_platform_admin())
  WITH CHECK (public.is_brand_member(brand_id) OR public.is_platform_admin());

ALTER TABLE public.reel_products ADD COLUMN catalog_id uuid REFERENCES public.brand_catalog(id) ON DELETE SET NULL;
CREATE INDEX reel_products_catalog_idx ON public.reel_products(catalog_id) WHERE catalog_id IS NOT NULL;