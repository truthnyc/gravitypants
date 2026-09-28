create or replace function public.accept_invite(_token text)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare inv public.workspace_invites; em text; seats int; members int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from public.workspace_invites where token = _token;
  if inv.id is null then raise exception 'Invite not found or already used'; end if;
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  if em = '' or lower(inv.email) <> em then raise exception 'This invite was sent to a different email address'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = auth.uid()) then
    if inv.accepted_at is null then update public.workspace_invites set accepted_at = now() where id = inv.id; end if;
    return inv.workspace_id;
  end if;
  if inv.accepted_at is not null then raise exception 'Invite not found or already used'; end if;
  if inv.expires_at < now() then raise exception 'This invite has expired'; end if;
  if public.in_other_team(auth.uid(), inv.workspace_id) is not null then
    raise exception 'Already a member of another team';
  end if;
  seats := public.workspace_seats(inv.workspace_id);
  select count(*) into members from public.workspace_members where workspace_id = inv.workspace_id;
  if members >= seats then raise exception 'This workspace is full'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role);
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end
$function$;