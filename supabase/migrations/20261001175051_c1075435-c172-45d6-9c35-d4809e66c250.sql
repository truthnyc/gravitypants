CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
  session_id text NOT NULL CHECK (char_length(session_id) BETWEEN 8 AND 64),
  path text NOT NULL CHECK (char_length(path) <= 300),
  referrer text CHECK (char_length(referrer) <= 300),
  utm_source text CHECK (char_length(utm_source) <= 100),
  utm_medium text CHECK (char_length(utm_medium) <= 100),
  utm_campaign text CHECK (char_length(utm_campaign) <= 150),
  device text CHECK (device IN ('mobile','tablet','desktop')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record a visit" ON public.page_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX page_views_created_idx ON public.page_views (created_at);

CREATE TABLE public.admin_report_prefs (
  user_id uuid PRIMARY KEY,
  weekly_email boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_report_prefs TO authenticated;
GRANT ALL ON public.admin_report_prefs TO service_role;
ALTER TABLE public.admin_report_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own report prefs" ON public.admin_report_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() AND public.is_platform_admin());