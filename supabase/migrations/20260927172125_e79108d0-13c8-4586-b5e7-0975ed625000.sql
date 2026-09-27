CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'photo',
  url text NOT NULL,
  width integer,
  height integer,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled ad',
  primary_format text NOT NULL DEFAULT '9:16',
  formats text[] NOT NULL DEFAULT ARRAY['9:16']::text[],
  pace text NOT NULL DEFAULT 'standard',
  logo jsonb NOT NULL DEFAULT '{}'::jsonb,
  end_card jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_template boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  duration_sec numeric NOT NULL DEFAULT 2.5,
  photo jsonb NOT NULL DEFAULT '{}'::jsonb,
  transition_in jsonb NOT NULL DEFAULT '{"type":"fade","speed":"smooth"}'::jsonb,
  headline jsonb,
  subline jsonb,
  logo_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX frames_project_id_sort_order_idx ON public.frames (project_id, sort_order);
CREATE INDEX projects_workspace_idx ON public.projects (workspace_id, deleted_at);

CREATE TABLE public.brand_kit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  logos jsonb NOT NULL DEFAULT '[]'::jsonb,
  colors text[] NOT NULL DEFAULT ARRAY[]::text[],
  headline_font text,
  body_font text,
  default_logo_positions jsonb NOT NULL DEFAULT '{}'::jsonb,
  end_card jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frames TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kit TO anon, authenticated;
GRANT ALL ON public.assets TO service_role;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.frames TO service_role;
GRANT ALL ON public.brand_kit TO service_role;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared workspace access" ON public.assets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Shared workspace access" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Shared workspace access" ON public.frames FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Shared workspace access" ON public.brand_kit FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER frames_updated_at BEFORE UPDATE ON public.frames FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER brand_kit_updated_at BEFORE UPDATE ON public.brand_kit FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.projects (id, workspace_id, name, primary_format, formats, pace, logo)
VALUES
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-000000000001', 'Spring Sale teaser', '9:16', ARRAY['9:16','1:1','16:9']::text[], 'standard', '{"size_pct":16,"opacity":"solid","version":"auto","show_on":"all","positions":{"9:16":"top-right","1:1":"top-right","16:9":"bottom-right"}}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-000000000001', 'New arrivals — sneakers', '1:1', ARRAY['1:1','9:16']::text[], 'fast', '{"size_pct":16,"opacity":"solid","version":"auto","show_on":"first_last","positions":{"9:16":"top-right","1:1":"top-right","16:9":"bottom-right"}}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001', 'Weekend cafe promo', '16:9', ARRAY['16:9']::text[], 'relaxed', '{"size_pct":16,"opacity":"solid","version":"auto","show_on":"all","positions":{"9:16":"top-right","1:1":"top-right","16:9":"bottom-right"}}'::jsonb);

INSERT INTO public.frames (project_id, sort_order, duration_sec, photo, transition_in, headline, subline)
VALUES
  ('11111111-1111-4111-8111-111111111111', 0, 2.5, '{"background_color":"#0071E3","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"slow_zoom_in","brightness":0,"darken_for_text":true}'::jsonb, '{"type":"cut","speed":"smooth"}'::jsonb, '{"text":"Spring Sale","size_px":108,"color":"#FFFFFF","animation":"rise","position":"center","same_on_all":false}'::jsonb, NULL),
  ('11111111-1111-4111-8111-111111111111', 1, 2.5, '{"background_color":"#7D3BD6","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"pan_left","brightness":0,"darken_for_text":false}'::jsonb, '{"type":"fade","speed":"smooth"}'::jsonb, NULL, NULL),
  ('11111111-1111-4111-8111-111111111111', 2, 2.5, '{"background_color":"#0B7A6F","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"none","brightness":0,"darken_for_text":false}'::jsonb, '{"type":"fade","speed":"smooth"}'::jsonb, NULL, NULL),
  ('11111111-1111-4111-8111-111111111111', 3, 2.5, '{"background_color":"#B25200","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"slow_zoom_out","brightness":0,"darken_for_text":false}'::jsonb, '{"type":"fade","speed":"smooth"}'::jsonb, NULL, NULL),
  ('22222222-2222-4222-8222-222222222222', 0, 2.0, '{"background_color":"#1D1D1F","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"slow_zoom_in","brightness":0,"darken_for_text":true}'::jsonb, '{"type":"cut","speed":"quick"}'::jsonb, '{"text":"New arrivals","size_px":108,"color":"#FFFFFF","animation":"fade","position":"bottom-left","same_on_all":false}'::jsonb, '{"text":"In store now","size_px":48,"color":"#FFFFFF","animation":"fade","position":"bottom-left","keep_under_headline":true}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 1, 2.0, '{"background_color":"#48484A","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"pan_right","brightness":0,"darken_for_text":false}'::jsonb, '{"type":"slide","speed":"quick"}'::jsonb, NULL, NULL),
  ('22222222-2222-4222-8222-222222222222', 2, 2.0, '{"background_color":"#C4001A","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"none","brightness":0,"darken_for_text":false}'::jsonb, '{"type":"fade","speed":"quick"}'::jsonb, NULL, NULL),
  ('33333333-3333-4333-8333-333333333333', 0, 3.0, '{"background_color":"#B25200","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"slow_zoom_in","brightness":0,"darken_for_text":true}'::jsonb, '{"type":"cut","speed":"smooth"}'::jsonb, '{"text":"Weekend coffee","size_px":108,"color":"#FFFFFF","animation":"rise","position":"center","same_on_all":false}'::jsonb, NULL),
  ('33333333-3333-4333-8333-333333333333', 1, 3.0, '{"background_color":"#0B7A6F","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"pan_left","brightness":0,"darken_for_text":false}'::jsonb, '{"type":"dip_black","speed":"smooth"}'::jsonb, NULL, NULL),
  ('33333333-3333-4333-8333-333333333333', 2, 3.0, '{"background_color":"#6E6E73","fit":"fill","focus":{"x":0.5,"y":0.5},"movement":"none","brightness":0,"darken_for_text":false}'::jsonb, '{"type":"fade","speed":"smooth"}'::jsonb, NULL, NULL);

INSERT INTO public.brand_kit (workspace_id) VALUES ('00000000-0000-4000-8000-000000000001');