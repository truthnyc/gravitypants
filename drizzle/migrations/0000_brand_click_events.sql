CREATE TABLE public.directory_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  brand_id uuid NOT NULL REFERENCES public.directory_brands(id) ON DELETE CASCADE,
  reel_id uuid,
  reel_kind text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.directory_click_events TO service_role;
ALTER TABLE public.directory_click_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX directory_click_events_brand_idx ON public.directory_click_events (brand_id, created_at);
CREATE INDEX directory_reel_views_reel_idx ON public.directory_reel_views (reel_id, created_at);