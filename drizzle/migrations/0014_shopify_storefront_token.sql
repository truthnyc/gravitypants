ALTER TABLE public.shopify_shops ADD COLUMN IF NOT EXISTS storefront_token text;
ALTER TABLE public.shopify_shops ADD COLUMN IF NOT EXISTS branding_synced_at timestamptz;
COMMENT ON COLUMN public.shopify_shops.storefront_token IS 'AES-GCM encrypted Storefront API token, used only to read shop.brand.';