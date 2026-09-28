create or replace function public.kit_shared(_ws uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspaces k
    join public.workspaces w on w.owner_id = k.owner_id
    join public.workspace_members m on m.workspace_id = w.id and m.user_id = auth.uid()
    where k.id = _ws and k.owner_id is not null)
$$;
grant execute on function public.kit_shared(uuid) to authenticated;

create or replace function public.kit_workspaces(_ws uuid) returns setof uuid language sql stable security definer set search_path = public as $$
  select w.id from public.workspaces k join public.workspaces w on w.owner_id = k.owner_id
  where k.id = _ws and public.is_workspace_member(_ws::text)
  union select _ws where public.is_workspace_member(_ws::text)
$$;
grant execute on function public.kit_workspaces(uuid) to authenticated;

drop policy if exists "Members read kits" on public.brand_kits;
create policy "Members read kits" on public.brand_kits for select to authenticated
  using (public.is_workspace_member(workspace_id::text) or public.kit_shared(workspace_id) or public.has_support_session(workspace_id::text) or public.is_platform_admin());
drop policy if exists "Members edit kits" on public.brand_kits;
create policy "Members edit kits" on public.brand_kits for update to authenticated
  using (public.is_workspace_member(workspace_id::text) or public.kit_shared(workspace_id) or public.has_support_session(workspace_id::text))
  with check ((public.is_workspace_member(workspace_id::text) or public.kit_shared(workspace_id) or public.has_support_session(workspace_id::text)) and public.brand_kits_enabled(workspace_id));
drop policy if exists "Creator or admin deletes kits" on public.brand_kits;
create policy "Creator or admin deletes kits" on public.brand_kits for delete to authenticated
  using (((public.is_workspace_member(workspace_id::text) or public.kit_shared(workspace_id)) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text))) or public.has_support_session(workspace_id::text));

drop policy if exists "brand-assets read" on storage.objects;
create policy "brand-assets read" on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and (public.is_workspace_member((storage.foldername(name))[1]) or public.kit_shared(((storage.foldername(name))[1])::uuid) or public.has_support_session((storage.foldername(name))[1]) or public.is_platform_admin()));

create or replace function public.ensure_workspace() returns uuid language plpgsql security definer set search_path = public as $function$
declare uid uuid := auth.uid(); ws uuid; first_ws uuid; em text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  insert into public.profiles (user_id) values (uid) on conflict do nothing;
  select workspace_id into first_ws from public.workspace_members where user_id = uid order by created_at limit 1;
  if exists (select 1 from public.workspaces where owner_id = uid) then return first_ws; end if;
  if first_ws is null then
    select id into ws from public.workspaces where id = '00000000-0000-4000-8000-000000000001' and owner_id is null for update;
  end if;
  if ws is not null then
    update public.workspaces set owner_id = uid where id = ws;
  else
    em := coalesce(auth.jwt() ->> 'email', 'My');
    insert into public.workspaces (name, owner_id) values (split_part(em, '@', 1) || '''s ads', uid) returning id into ws;
    insert into public.brand_kit (workspace_id) values (ws);
  end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, uid, 'owner') on conflict do nothing;
  return coalesce(first_ws, ws);
end $function$;