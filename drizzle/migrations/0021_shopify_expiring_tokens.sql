ALTER TABLE public.shopify_shops ADD COLUMN IF NOT EXISTS refresh_token text;
ALTER TABLE public.shopify_shops ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
ALTER TABLE public.shopify_shops ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamptz;
COMMENT ON COLUMN public.shopify_shops.refresh_token IS 'AES-GCM encrypted refresh token for the expiring offline access token; service_role only.';
COMMENT ON COLUMN public.shopify_shops.token_expires_at IS 'When the stored offline access token stops working; null means a legacy non-expiring token.';