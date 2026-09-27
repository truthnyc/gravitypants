ALTER TABLE public.brand_kit ADD COLUMN IF NOT EXISTS logo_size_pct integer NOT NULL DEFAULT 16;
ALTER TABLE public.brand_kit ADD COLUMN IF NOT EXISTS custom_fonts jsonb NOT NULL DEFAULT '[]'::jsonb;