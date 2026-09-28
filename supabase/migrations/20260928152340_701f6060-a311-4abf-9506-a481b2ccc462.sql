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
    and coalesce(w.owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
        is distinct from (select owner_id from public.workspaces where id = _ws)
    and public.workspace_is_team(m.workspace_id)
  limit 1
$$;