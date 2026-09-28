create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  name text not null default 'Untitled template',
  thumbnail_url text,
  visibility text not null default 'private' check (visibility in ('private','team')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.templates to authenticated;
grant all on public.templates to service_role;
alter table public.templates enable row level security;
create index templates_ws on public.templates (workspace_id);
create trigger templates_updated_at before update on public.templates for each row execute function public.set_updated_at();

create or replace function public.workspace_is_team(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w join public.profiles p on p.user_id = w.owner_id where w.id = _ws and p.is_platform_admin)
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = _ws and (
        (b.comp_plan in ('team','team_yearly') and b.comp_until > now())
        or (b.plan in ('team','team_yearly') and (b.status <> 'canceled' or b.current_period_end > now()))))
$$;
revoke execute on function public.workspace_is_team(uuid) from public, anon;
grant execute on function public.workspace_is_team(uuid) to authenticated;

create policy "Read own or team templates" on public.templates for select to authenticated
  using ((public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or visibility = 'team'))
    or public.has_support_session(workspace_id::text) or public.is_platform_admin());
create policy "Members save templates" on public.templates for insert to authenticated
  with check (public.is_workspace_member(workspace_id::text) and created_by = auth.uid()
    and public.brand_kits_enabled(workspace_id)
    and (visibility = 'private' or public.workspace_is_team(workspace_id)));
create policy "Creator or admin edits templates" on public.templates for update to authenticated
  using (public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text)))
  with check (public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text))
    and (visibility = 'private' or public.workspace_is_team(workspace_id)));
create policy "Creator or admin deletes templates" on public.templates for delete to authenticated
  using (public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text)));