CREATE TABLE public.mood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  requested_by uuid NOT NULL,
  workspace_id uuid,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  CONSTRAINT mood_requests_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 30),
  CONSTRAINT mood_requests_status CHECK (status IN ('pending','approved','denied'))
);
GRANT SELECT, INSERT, UPDATE ON public.mood_requests TO authenticated;
GRANT ALL ON public.mood_requests TO service_role;
ALTER TABLE public.mood_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requesters read own mood requests" ON public.mood_requests FOR SELECT TO authenticated USING (requested_by = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Requesters insert own mood requests" ON public.mood_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Staff update mood requests" ON public.mood_requests FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE UNIQUE INDEX mood_requests_pending_name ON public.mood_requests (lower(name)) WHERE status = 'pending';
CREATE INDEX mood_requests_created_idx ON public.mood_requests (created_at DESC);