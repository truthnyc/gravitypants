alter table public.templates drop constraint if exists templates_visibility_check;
alter table public.templates add constraint templates_visibility_check check (visibility in ('private','team','global'));

drop policy if exists "Read own or team templates" on public.templates;
create policy "Read own or team templates" on public.templates for select to authenticated
  using (visibility = 'global'
    or (public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or visibility = 'team'))
    or public.has_support_session(workspace_id::text) or public.is_platform_admin());

drop policy if exists "Members save templates" on public.templates;
create policy "Members save templates" on public.templates for insert to authenticated
  with check (public.is_workspace_member(workspace_id::text) and created_by = auth.uid()
    and public.brand_kits_enabled(workspace_id)
    and (visibility = 'private'
      or (visibility = 'team' and public.workspace_is_team(workspace_id))
      or (visibility = 'global' and public.is_platform_admin())));

drop policy if exists "Creator or admin edits templates" on public.templates;
create policy "Creator or admin edits templates" on public.templates for update to authenticated
  using ((public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text))) or public.is_platform_admin())
  with check (((public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text))) or public.is_platform_admin())
    and (visibility = 'private'
      or (visibility = 'team' and public.workspace_is_team(workspace_id))
      or (visibility = 'global' and public.is_platform_admin())));

drop policy if exists "Creator or admin deletes templates" on public.templates;
create policy "Creator or admin deletes templates" on public.templates for delete to authenticated
  using ((public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text))) or public.is_platform_admin());