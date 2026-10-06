CREATE TABLE public.directory_greeting_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL CHECK (length(session_id) <= 64),
  rule text NOT NULL CHECK (rule IN ('campaign','countdown','fun_day','weather','season','returning','time_of_day','day_of_week','fallback')),
  greeting text NOT NULL CHECK (length(greeting) <= 80),
  action text NOT NULL CHECK (action IN ('shown','mood_click','filter')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.directory_greeting_log TO anon, authenticated;
GRANT SELECT ON public.directory_greeting_log TO authenticated;
GRANT ALL ON public.directory_greeting_log TO service_role;
ALTER TABLE public.directory_greeting_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log greeting events" ON public.directory_greeting_log FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read greeting events" ON public.directory_greeting_log FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE INDEX directory_greeting_log_created_idx ON public.directory_greeting_log (created_at);