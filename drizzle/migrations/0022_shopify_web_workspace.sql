ALTER TABLE public.shopify_shops ADD COLUMN IF NOT EXISTS web_workspace_id uuid;
CREATE INDEX IF NOT EXISTS shopify_shops_web_workspace_idx ON public.shopify_shops (web_workspace_id);
COMMENT ON COLUMN public.shopify_shops.web_workspace_id IS 'Website workspace that connected this store from Brand home (service role only).';