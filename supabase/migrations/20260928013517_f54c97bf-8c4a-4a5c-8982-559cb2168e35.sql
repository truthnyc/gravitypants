create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'Brand kit',
  logo_url text,
  logo_dark_url text,
  colors text[] not null default '{}',
  headline_font text,
  subline_font text,
  is_default boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.brand_kits to authenticated;
grant all on public.brand_kits to service_role;
alter table public.brand_kits enable row level security;
create unique index brand_kits_one_default on public.brand_kits (workspace_id) where is_default;
create index brand_kits_ws on public.brand_kits (workspace_id);
create trigger brand_kits_updated_at before update on public.brand_kits for each row execute function public.set_updated_at();

create or replace function public.brand_kits_enabled(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
    or exists (select 1 from public.workspaces w join public.profiles p on p.user_id = w.owner_id where w.id = _ws and p.is_platform_admin)
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = _ws and (
        (b.comp_plan is not null and b.comp_until > now())
        or (b.plan in ('simple','business','business_yearly','team','team_yearly')
            and (b.status <> 'canceled' or b.current_period_end > now()))))
$$;
revoke execute on function public.brand_kits_enabled(uuid) from public, anon;
grant execute on function public.brand_kits_enabled(uuid) to authenticated;

create policy "Members read kits" on public.brand_kits for select to authenticated
  using (public.is_workspace_member(workspace_id::text) or public.has_support_session(workspace_id::text) or public.is_platform_admin());
create policy "Admins add kits" on public.brand_kits for insert to authenticated
  with check ((public.is_workspace_admin(workspace_id::text) or public.has_support_session(workspace_id::text)) and public.brand_kits_enabled(workspace_id));
create policy "Admins edit kits" on public.brand_kits for update to authenticated
  using (public.is_workspace_admin(workspace_id::text) or public.has_support_session(workspace_id::text))
  with check ((public.is_workspace_admin(workspace_id::text) or public.has_support_session(workspace_id::text)) and public.brand_kits_enabled(workspace_id));
create policy "Admins delete kits" on public.brand_kits for delete to authenticated
  using (public.is_workspace_admin(workspace_id::text) or public.has_support_session(workspace_id::text));

create or replace function public.set_default_brand_kit(_ws uuid, _kit uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_workspace_admin(_ws::text) or public.has_support_session(_ws::text)) then raise exception 'Only owners and admins can change the default kit'; end if;
  if not public.brand_kits_enabled(_ws) then raise exception 'Brand kits need a paid plan'; end if;
  update public.brand_kits set is_default = false where workspace_id = _ws and is_default and id is distinct from _kit;
  if _kit is not null then update public.brand_kits set is_default = true where workspace_id = _ws and id = _kit; end if;
end $$;
revoke execute on function public.set_default_brand_kit(uuid, uuid) from public, anon;
grant execute on function public.set_default_brand_kit(uuid, uuid) to authenticated;

alter table public.projects add column brand_kit_id uuid references public.brand_kits(id) on delete set null;

create policy "brand-assets read" on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and (public.is_workspace_member((storage.foldername(name))[1]) or public.has_support_session((storage.foldername(name))[1]) or public.is_platform_admin()));
create policy "brand-assets insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and (public.is_workspace_admin((storage.foldername(name))[1]) or public.has_support_session((storage.foldername(name))[1])));
create policy "brand-assets update" on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and (public.is_workspace_admin((storage.foldername(name))[1]) or public.has_support_session((storage.foldername(name))[1])));
create policy "brand-assets delete" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and (public.is_workspace_admin((storage.foldername(name))[1]) or public.has_support_session((storage.foldername(name))[1])));