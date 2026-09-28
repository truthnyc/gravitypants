-- Seats per plan
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS seats integer NOT NULL DEFAULT 1;
UPDATE public.plans SET seats = 3 WHERE id IN ('team', 'team_yearly');

-- 7-day trial
ALTER TABLE public.workspace_billing ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');

-- Admin check (owner or admin role) without recursive policies
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_ws text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id::text = _ws and user_id = auth.uid() and role in ('owner','admin')
  )
$$;

-- Members can see each other; owners/admins manage membership
CREATE POLICY "Members read workspace memberships" ON public.workspace_members
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id::text));
CREATE POLICY "Admins add members" ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(workspace_id::text));
CREATE POLICY "Admins update member roles" ON public.workspace_members
  FOR UPDATE TO authenticated USING (public.is_workspace_admin(workspace_id::text)) WITH CHECK (public.is_workspace_admin(workspace_id::text));
CREATE POLICY "Admins remove members" ON public.workspace_members
  FOR DELETE TO authenticated USING (public.is_workspace_admin(workspace_id::text));

-- Members can create workspaces (for team workspaces); owners/admins can rename
CREATE POLICY "Signed-in users create workspaces" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins update workspace" ON public.workspaces
  FOR UPDATE TO authenticated USING (public.is_workspace_admin(id::text)) WITH CHECK (public.is_workspace_admin(id::text));

-- Invites
CREATE TABLE public.workspace_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read invites" ON public.workspace_invites
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id::text));
CREATE POLICY "Admins manage invites" ON public.workspace_invites
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(workspace_id::text));
CREATE POLICY "Admins update invites" ON public.workspace_invites
  FOR UPDATE TO authenticated USING (public.is_workspace_admin(workspace_id::text)) WITH CHECK (public.is_workspace_admin(workspace_id::text));
CREATE POLICY "Admins delete invites" ON public.workspace_invites
  FOR DELETE TO authenticated USING (public.is_workspace_admin(workspace_id::text));

-- Member list with emails for the Members page (members only)
CREATE OR REPLACE FUNCTION public.workspace_member_list(_ws uuid)
RETURNS TABLE(user_id uuid, email text, display_name text, role text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  select m.user_id, u.email, p.display_name, m.role, m.created_at
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.user_id = m.user_id
  where m.workspace_id = _ws and public.is_workspace_member(_ws::text)
  order by m.created_at
$$;

-- Seat count for a workspace's plan
CREATE OR REPLACE FUNCTION public.workspace_seats(_ws uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select coalesce((select p.seats from public.workspace_billing b join public.plans p on p.id = b.plan where b.workspace_id = _ws), 1)
$$;

-- Accept an invite by token: adds the signed-in user if the email matches
CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare inv public.workspace_invites; em text; seats int; members int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from public.workspace_invites where token = _token and accepted_at is null;
  if inv.id is null then raise exception 'Invite not found or already used'; end if;
  if inv.expires_at < now() then raise exception 'This invite has expired'; end if;
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  if em = '' or lower(inv.email) <> em then raise exception 'This invite was sent to a different email address'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = auth.uid()) then
    update public.workspace_invites set accepted_at = now() where id = inv.id;
    return inv.workspace_id;
  end if;
  seats := public.workspace_seats(inv.workspace_id);
  select count(*) into members from public.workspace_members where workspace_id = inv.workspace_id;
  if members >= seats then raise exception 'This workspace is full'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role);
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end
$$;

-- Inviting also respects seats (admins only, checked by RLS on the table)
CREATE OR REPLACE FUNCTION public.invite_seat_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare seats int; used int;
begin
  seats := public.workspace_seats(new.workspace_id);
  select (select count(*) from public.workspace_members where workspace_id = new.workspace_id)
       + (select count(*) from public.workspace_invites where workspace_id = new.workspace_id and accepted_at is null and expires_at > now())
    into used;
  if used >= seats then raise exception 'No seats left on this plan'; end if;
  return new;
end
$$;
CREATE TRIGGER invite_seat_check BEFORE INSERT ON public.workspace_invites FOR EACH ROW EXECUTE FUNCTION public.invite_seat_check();

-- Trial: 3 exports, watermarked; export_status reports it
CREATE OR REPLACE FUNCTION public.export_status(_ws uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare b public.workspace_billing; w public.workspaces; lim int; used int := 0; since timestamptz; eff text;
begin
  if not public.is_workspace_member(_ws::text) and not public.has_support_session(_ws::text) then
    return jsonb_build_object('allowed', false, 'reason', 'no_access'); end if;
  select * into w from public.workspaces where id = _ws;
  if w.suspended_at is not null then return jsonb_build_object('allowed', false, 'reason', 'suspended'); end if;
  if exists (select 1 from public.profiles where user_id = w.owner_id and is_platform_admin) then
    return jsonb_build_object('allowed', true, 'reason', null); end if;
  select * into b from public.workspace_billing where workspace_id = _ws;
  if b.comp_plan is not null and b.comp_until > now() then
    eff := b.comp_plan;
  else
    if b is null or b.plan in ('trial','none') then
      if b is not null and b.plan = 'trial' and b.trial_ends_at > now() then
        select count(*) into used from public.export_usage where workspace_id = _ws;
        return jsonb_build_object('allowed', used < 3, 'reason', case when used < 3 then null else 'limit_reached' end,
          'used', used, 'limit', 3, 'watermark', true, 'resets_at', b.trial_ends_at);
      end if;
      return jsonb_build_object('allowed', false, 'reason', 'no_plan');
    end if;
    if b.status = 'past_due' then return jsonb_build_object('allowed', false, 'reason', 'payment_problem'); end if;
    if b.status = 'canceled' and (b.current_period_end is null or b.current_period_end < now()) then
      return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
    eff := b.plan;
  end if;
  select monthly_exports into lim from public.plans where id = eff;
  if lim is null then return jsonb_build_object('allowed', true, 'reason', null); end if;
  since := greatest(coalesce(b.current_period_start, now() - interval '1 month'), now() - interval '1 month');
  select count(*) into used from public.export_usage where workspace_id = _ws and created_at >= since;
  return jsonb_build_object('allowed', used < lim, 'reason', case when used < lim then null else 'limit_reached' end,
    'used', used, 'limit', lim, 'resets_at', b.current_period_end);
end
$$;