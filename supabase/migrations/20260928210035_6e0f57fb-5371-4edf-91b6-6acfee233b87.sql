CREATE TABLE public.template_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  version integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX template_events_template_idx ON public.template_events (template_id, created_at DESC);
GRANT SELECT ON public.template_events TO authenticated;
GRANT ALL ON public.template_events TO service_role;
ALTER TABLE public.template_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read template history" ON public.template_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));