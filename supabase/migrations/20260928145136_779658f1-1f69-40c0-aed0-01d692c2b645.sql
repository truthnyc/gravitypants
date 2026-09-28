create or replace function public.in_other_team(_uid uuid, _ws uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.workspace_id
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id
  where m.user_id = _uid
    and m.workspace_id <> _ws
    and coalesce(w.owner_id, '00000000-0000-0000-0000-000000000000'::uuid) <> _uid
    and public.workspace_is_team(m.workspace_id)
  limit 1
$$;

grant execute on function public.in_other_team(uuid, uuid) to authenticated, service_role;

create or replace function public.invite_seat_check()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare seats int; used int; target uuid;
begin
  seats := public.workspace_seats(new.workspace_id);
  select (select count(*) from public.workspace_members where workspace_id = new.workspace_id)
       + (select count(*) from public.workspace_invites where workspace_id = new.workspace_id and accepted_at is null and expires_at > now())
    into used;
  if used >= seats then raise exception 'No seats left on this plan'; end if;

  select id into target from auth.users where lower(email) = lower(new.email) limit 1;
  if target is not null and public.in_other_team(target, new.workspace_id) is not null then
    raise exception 'Already a member of another team';
  end if;

  return new;
end
$function$;

create or replace function public.accept_invite(_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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

create or replace function public.accept_my_invites()
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  uid uuid := auth.uid();
  em text;
  inv record;
  joined uuid;
  seats int;
  members int;
begin
  if uid is null then return null; end if;

  select lower(email) into em from auth.users where id = uid;
  if coalesce(em, '') = '' then return null; end if;

  for inv in
    select * from public.workspace_invites
    where lower(email) = em and accepted_at is null and expires_at > now()
    order by created_at
  loop
    if exists (
      select 1 from public.workspace_members
      where workspace_id = inv.workspace_id and user_id = uid
    ) then
      update public.workspace_invites set accepted_at = now() where id = inv.id;
      joined := inv.workspace_id;
      continue;
    end if;

    if public.in_other_team(uid, inv.workspace_id) is not null then continue; end if;

    seats := public.workspace_seats(inv.workspace_id);
    select count(*) into members from public.workspace_members where workspace_id = inv.workspace_id;
    if members >= seats then continue; end if;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, uid, inv.role);
    update public.workspace_invites set accepted_at = now() where id = inv.id;
    joined := inv.workspace_id;
  end loop;

  return joined;
end
$function$;