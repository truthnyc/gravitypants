ALTER TABLE public.reel_products
  ADD COLUMN source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','link','feed')),
  ADD COLUMN image_url text CHECK (image_url IS NULL OR (image_url ~ '^https://' AND char_length(image_url) <= 2000)),
  ADD COLUMN availability text NOT NULL DEFAULT 'unknown' CHECK (availability IN ('in_stock','out_of_stock','unknown')),
  ADD COLUMN last_synced_at timestamptz,
  ADD COLUMN sync_failures integer NOT NULL DEFAULT 0;
CREATE INDEX reel_products_link_sync_idx ON public.reel_products(last_synced_at NULLS FIRST) WHERE source_type = 'link';