create or replace function private.workspace_seat_activity(_ws uuid)
returns table(user_id uuid, email text, display_name text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.is_workspace_member(_ws::text) then
    raise exception 'not a member';
  end if;
  return query
  select m.user_id, u.email::text, p.display_name, m.role, m.created_at, u.last_sign_in_at
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.user_id = m.user_id
  where m.workspace_id = _ws
  order by m.created_at;
end;
$$;

create or replace function public.workspace_seat_activity(_ws uuid)
returns table(user_id uuid, email text, display_name text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
stable
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return query select * from private.workspace_seat_activity($1);
end;
$$;

grant execute on function public.workspace_seat_activity(uuid) to authenticated;