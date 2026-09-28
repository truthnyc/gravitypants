alter table public.workspace_members drop constraint workspace_members_role_check;
update public.workspace_members set role = 'editor' where role = 'member';
alter table public.workspace_members add constraint workspace_members_role_check
  check (role in ('owner', 'admin', 'editor'));

insert into public.workspace_members (workspace_id, user_id, role)
select '63903993-0376-44ad-813b-d879f39b160e'::uuid,
       '82d2a754-fec3-4bf1-bd86-a9aea9fea6ba'::uuid,
       'editor'
where exists (
  select 1
  from public.workspace_invites
  where id = 'fcf15ad1-8cbb-407c-a795-57aa0b7f27ab'::uuid
    and workspace_id = '63903993-0376-44ad-813b-d879f39b160e'::uuid
    and lower(email) = 'test3@gravitypants.com'
    and accepted_at is null
    and expires_at > now()
)
on conflict (workspace_id, user_id) do update set role = excluded.role;

update public.workspace_invites
set accepted_at = now()
where id = 'fcf15ad1-8cbb-407c-a795-57aa0b7f27ab'::uuid
  and workspace_id = '63903993-0376-44ad-813b-d879f39b160e'::uuid
  and lower(email) = 'test3@gravitypants.com'
  and accepted_at is null;

create or replace function public.accept_my_invites()
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  uid uuid := auth.uid();
  em text;
  inv record;
  joined uuid;
  seats int;
  members int;
begin
  if uid is null then return null; end if;

  select lower(email) into em
  from auth.users
  where id = uid;

  if coalesce(em, '') = '' then return null; end if;

  for inv in
    select *
    from public.workspace_invites
    where lower(email) = em
      and accepted_at is null
      and expires_at > now()
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

    seats := public.workspace_seats(inv.workspace_id);
    select count(*) into members
    from public.workspace_members
    where workspace_id = inv.workspace_id;

    if members >= seats then continue; end if;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, uid, inv.role);
    update public.workspace_invites set accepted_at = now() where id = inv.id;
    joined := inv.workspace_id;
  end loop;

  return joined;
end
$$;

revoke execute on function public.accept_my_invites() from public, anon;
grant execute on function public.accept_my_invites() to authenticated, service_role;