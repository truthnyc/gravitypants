alter table public.projects add column if not exists created_by uuid default auth.uid();
update public.projects p set created_by = w.owner_id from public.workspaces w where w.id = p.workspace_id and p.created_by is null;
alter table public.assets add column if not exists created_by uuid default auth.uid();
update public.assets a set created_by = w.owner_id from public.workspaces w where w.id = a.workspace_id and a.created_by is null;

-- Projects: members read/create/edit; only creator or admin deletes or trashes.
drop policy "Workspace members" on public.projects;
create policy "Members read ads" on public.projects for select to authenticated using (public.is_workspace_member(workspace_id::text));
create policy "Members create ads" on public.projects for insert to authenticated with check (public.is_workspace_member(workspace_id::text));
create policy "Members edit ads" on public.projects for update to authenticated using (public.is_workspace_member(workspace_id::text)) with check (public.is_workspace_member(workspace_id::text));
create policy "Creator or admin deletes ads" on public.projects for delete to authenticated using (public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text)));

create or replace function public.guard_project_trash() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is distinct from old.deleted_at and auth.uid() is not null
     and old.created_by is distinct from auth.uid()
     and not public.is_workspace_admin(old.workspace_id::text)
     and not public.has_support_session(old.workspace_id::text) then
    raise exception 'Only the person who made this ad or a team admin can delete it';
  end if;
  new.created_by := old.created_by;
  return new;
end $$;
create trigger guard_project_trash before update on public.projects for each row execute function public.guard_project_trash();

-- Assets: same rule.
drop policy "Workspace members" on public.assets;
create policy "Members read assets" on public.assets for select to authenticated using (public.is_workspace_member(workspace_id::text));
create policy "Members add assets" on public.assets for insert to authenticated with check (public.is_workspace_member(workspace_id::text));
create policy "Members edit assets" on public.assets for update to authenticated using (public.is_workspace_member(workspace_id::text)) with check (public.is_workspace_member(workspace_id::text));
create policy "Creator or admin deletes assets" on public.assets for delete to authenticated using (public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text)));

-- Brand kits: editors can create and edit; only creator or admin deletes.
drop policy "Admins add kits" on public.brand_kits;
drop policy "Admins edit kits" on public.brand_kits;
drop policy "Admins delete kits" on public.brand_kits;
create policy "Members add kits" on public.brand_kits for insert to authenticated with check ((public.is_workspace_member(workspace_id::text) or public.has_support_session(workspace_id::text)) and public.brand_kits_enabled(workspace_id));
create policy "Members edit kits" on public.brand_kits for update to authenticated using (public.is_workspace_member(workspace_id::text) or public.has_support_session(workspace_id::text)) with check ((public.is_workspace_member(workspace_id::text) or public.has_support_session(workspace_id::text)) and public.brand_kits_enabled(workspace_id));
create policy "Creator or admin deletes kits" on public.brand_kits for delete to authenticated using ((public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or public.is_workspace_admin(workspace_id::text))) or public.has_support_session(workspace_id::text));

-- Templates: in team workspaces every member sees every template.
drop policy "Read own or team templates" on public.templates;
create policy "Read own or team templates" on public.templates for select to authenticated using ((public.is_workspace_member(workspace_id::text) and (created_by = auth.uid() or visibility = 'team' or public.workspace_is_team(workspace_id))) or public.has_support_session(workspace_id::text) or public.is_platform_admin());
update public.templates t set visibility = 'team' where public.workspace_is_team(t.workspace_id) and visibility = 'private';