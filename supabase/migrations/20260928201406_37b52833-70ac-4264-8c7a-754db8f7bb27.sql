alter table public.templates
  add column if not exists slug text unique,
  add column if not exists description text,
  add column if not exists format text check (format in ('9:16','1:1','16:9')),
  add column if not exists is_reusable boolean not null default false,
  add column if not exists source text not null default 'user' check (source in ('system','user','team')),
  add column if not exists sort_order integer not null default 0,
  add column if not exists style jsonb not null default '{}'::jsonb,
  add column if not exists slides jsonb not null default '[]'::jsonb;
alter table public.templates alter column workspace_id drop not null;
alter table public.templates alter column created_by drop not null;
update public.templates set source = 'team' where visibility = 'team' and source = 'user';
alter table public.templates add constraint templates_system_shape check (
  (source = 'system' and workspace_id is null and created_by is null)
  or (source <> 'system' and workspace_id is not null and created_by is not null));

drop policy if exists "Read own or team templates" on public.templates;
create policy "Read own or team templates" on public.templates for select to authenticated
  using (source = 'system' or visibility = 'global'
    or (public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or visibility = 'team'))
    or public.has_support_session(workspace_id::text) or public.is_platform_admin());