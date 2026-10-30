CREATE TABLE public.support_ticket_replies (
 id uuid PRIMARY KEY,
 ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 admin_user_id uuid NOT NULL,
 message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
 recipient_email text NOT NULL,
 delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed','suppressed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz
);
GRANT SELECT ON public.support_ticket_replies TO authenticated;
GRANT ALL ON public.support_ticket_replies TO service_role;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read support replies" ON public.support_ticket_replies FOR SELECT TO authenticated USING (public.is_platform_admin() AND public.is_workspace_member(workspace_id::text) OR public.is_platform_admin());
CREATE INDEX support_ticket_replies_ticket_idx ON public.support_ticket_replies(ticket_id, created_at);
COMMENT ON TABLE public.support_ticket_replies IS 'Support conversation history. Staff-only server actions derive recipient from the original ticket; email retries reuse the reply UUID.';