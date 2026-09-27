create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid,
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table public.profiles (
  user_id uuid primary key,
  display_name text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant all on public.workspaces, public.workspace_members, public.profiles to service_role;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.profiles enable row level security;

create or replace function public.is_workspace_member(_ws text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id::text = _ws and user_id = auth.uid())
$$;

create policy "Members read workspace" on public.workspaces for select to authenticated using (public.is_workspace_member(id::text));
create policy "Read own memberships" on public.workspace_members for select to authenticated using (user_id = auth.uid());
create policy "Read own profile" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "Update own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Legacy shared workspace, claimed by the first user
insert into public.workspaces (id, name) values ('00000000-0000-4000-8000-000000000001', 'Shared ads');

create or replace function public.ensure_workspace()
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ws uuid; em text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  insert into public.profiles (user_id) values (uid) on conflict do nothing;
  select workspace_id into ws from public.workspace_members where user_id = uid order by created_at limit 1;
  if ws is not null then return ws; end if;
  select id into ws from public.workspaces where id = '00000000-0000-4000-8000-000000000001' and owner_id is null for update;
  if ws is not null then
    update public.workspaces set owner_id = uid where id = ws;
  else
    em := coalesce(auth.jwt() ->> 'email', 'My');
    insert into public.workspaces (name, owner_id) values (split_part(em, '@', 1) || '''s ads', uid) returning id into ws;
    insert into public.brand_kit (workspace_id) values (ws);
  end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, uid, 'owner');
  return ws;
end $$;
revoke execute on function public.ensure_workspace() from public, anon;
grant execute on function public.ensure_workspace() to authenticated;
revoke execute on function public.is_workspace_member(text) from public, anon;
grant execute on function public.is_workspace_member(text) to authenticated;

-- Replace shared policies
drop policy "Shared workspace access" on public.projects;
drop policy "Shared workspace access" on public.frames;
drop policy "Shared workspace access" on public.assets;
drop policy "Shared workspace access" on public.brand_kit;
revoke all on public.projects, public.frames, public.assets, public.brand_kit from anon;
create policy "Workspace members" on public.projects for all to authenticated using (public.is_workspace_member(workspace_id::text)) with check (public.is_workspace_member(workspace_id::text));
create policy "Workspace members" on public.assets for all to authenticated using (public.is_workspace_member(workspace_id::text)) with check (public.is_workspace_member(workspace_id::text));
create policy "Workspace members" on public.brand_kit for all to authenticated using (public.is_workspace_member(workspace_id::text)) with check (public.is_workspace_member(workspace_id::text));
create policy "Workspace members" on public.frames for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id::text)))
  with check (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id::text)));

-- Storage: files live under <workspace_id>/...
drop policy "media read" on storage.objects;
drop policy "media insert" on storage.objects;
drop policy "media update" on storage.objects;
drop policy "media delete" on storage.objects;
create policy "media members read" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_workspace_member((storage.foldername(name))[1]));
create policy "media members insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_workspace_member((storage.foldername(name))[1]));
create policy "media members update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_workspace_member((storage.foldername(name))[1]));
create policy "media members delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_workspace_member((storage.foldername(name))[1]));