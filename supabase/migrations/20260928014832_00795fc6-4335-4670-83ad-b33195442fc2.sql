CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic text NOT NULL CHECK (topic IN ('billing','bug','question','feature')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  attachment_url text,
  ad_id uuid,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','priority')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Members file tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id::text));

-- Priority and status are always set by the server, never by the browser.
CREATE OR REPLACE FUNCTION public.support_ticket_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status := 'open';
  NEW.priority := CASE WHEN EXISTS (
    SELECT 1 FROM public.workspace_billing b
    WHERE b.workspace_id = NEW.workspace_id
      AND (b.comp_plan IN ('team','team_yearly') AND (b.comp_until IS NULL OR b.comp_until > now())
        OR (b.plan IN ('team','team_yearly') AND (b.status IN ('active','trialing','past_due')
            OR (b.current_period_end IS NOT NULL AND b.current_period_end > now()))))
  ) THEN 'priority' ELSE 'normal' END;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.support_ticket_defaults() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER support_ticket_defaults BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_ticket_defaults();