create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_admin from public.profiles where user_id = auth.uid()), false)
$$;
grant execute on function public.is_platform_admin() to authenticated;

alter table public.workspaces add column if not exists suspended_at timestamptz;
alter table public.workspace_billing add column if not exists comp_plan text, add column if not exists comp_until timestamptz;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  workspace_id uuid,
  target text,
  reason text,
  created_at timestamptz not null default now()
);
grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
alter table public.admin_audit_log enable row level security;
create policy "Admins read log" on public.admin_audit_log for select to authenticated using (public.is_platform_admin());

create table public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reason text not null,
  expires_at timestamptz not null default now() + interval '60 minutes',
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.support_sessions to authenticated;
grant all on public.support_sessions to service_role;
alter table public.support_sessions enable row level security;
create policy "Admins read sessions" on public.support_sessions for select to authenticated using (public.is_platform_admin());

create or replace function public.has_support_session(_ws text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() and exists (
    select 1 from public.support_sessions where workspace_id::text = _ws and admin_user_id = auth.uid()
      and ended_at is null and expires_at > now())
$$;
grant execute on function public.has_support_session(text) to authenticated;

-- admin reads
create policy "Admins read" on public.workspaces for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.workspace_members for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.profiles for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.projects for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.frames for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.assets for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.brand_kit for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.workspace_billing for select to authenticated using (public.is_platform_admin());
create policy "Admins read" on public.export_usage for select to authenticated using (public.is_platform_admin());
create policy "Admins read media" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_platform_admin());

-- support writes
create policy "Support edit" on public.projects for all to authenticated using (public.has_support_session(workspace_id::text)) with check (public.has_support_session(workspace_id::text));
create policy "Support edit" on public.assets for all to authenticated using (public.has_support_session(workspace_id::text)) with check (public.has_support_session(workspace_id::text));
create policy "Support edit" on public.brand_kit for all to authenticated using (public.has_support_session(workspace_id::text)) with check (public.has_support_session(workspace_id::text));
create policy "Support edit" on public.frames for all to authenticated
  using (exists (select 1 from public.projects p where p.id = frames.project_id and public.has_support_session(p.workspace_id::text)))
  with check (exists (select 1 from public.projects p where p.id = frames.project_id and public.has_support_session(p.workspace_id::text)));
create policy "Support media insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.has_support_session((storage.foldername(name))[1]));
create policy "Support media update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.has_support_session((storage.foldername(name))[1]));
create policy "Support media delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.has_support_session((storage.foldername(name))[1]));

-- log support writes
create or replace function public.log_support_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid; rid text;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_table_name = 'frames' then
    select workspace_id into ws from public.projects where id = coalesce(new.project_id, old.project_id);
  else ws := coalesce(new.workspace_id, old.workspace_id); end if;
  rid := coalesce(new.id, old.id)::text;
  if ws is not null and not public.is_workspace_member(ws::text) and public.has_support_session(ws::text) then
    insert into public.admin_audit_log (admin_user_id, action, workspace_id, target, reason)
    values (auth.uid(), 'support_write', ws, tg_table_name || ' ' || lower(tg_op) || ' ' || rid,
      (select reason from public.support_sessions where workspace_id = ws and admin_user_id = auth.uid() and ended_at is null order by created_at desc limit 1));
  end if;
  return coalesce(new, old);
end $$;
create trigger log_support_projects after insert or update or delete on public.projects for each row execute function public.log_support_write();
create trigger log_support_frames after insert or update or delete on public.frames for each row execute function public.log_support_write();
create trigger log_support_assets after insert or update or delete on public.assets for each row execute function public.log_support_write();
create trigger log_support_brand after insert or update or delete on public.brand_kit for each row execute function public.log_support_write();

-- export rules
create or replace function public.export_status(_ws uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare b public.workspace_billing; w public.workspaces; lim int; used int := 0; since timestamptz; eff text;
begin
  if not public.is_workspace_member(_ws::text) and not public.has_support_session(_ws::text) then
    return jsonb_build_object('allowed', false, 'reason', 'no_access'); end if;
  select * into w from public.workspaces where id = _ws;
  if w.suspended_at is not null then return jsonb_build_object('allowed', false, 'reason', 'suspended'); end if;
  if exists (select 1 from public.profiles where user_id = w.owner_id and is_platform_admin) then
    return jsonb_build_object('allowed', true, 'reason', null); end if;
  select * into b from public.workspace_billing where workspace_id = _ws;
  if b.comp_plan is not null and b.comp_until > now() then
    eff := b.comp_plan;
  else
    if b is null or b.plan in ('trial','none') then return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
    if b.status = 'past_due' then return jsonb_build_object('allowed', false, 'reason', 'payment_problem'); end if;
    if b.status = 'canceled' and (b.current_period_end is null or b.current_period_end < now()) then
      return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
    eff := b.plan;
  end if;
  select monthly_exports into lim from public.plans where id = eff;
  if lim is null then return jsonb_build_object('allowed', true, 'reason', null); end if;
  since := greatest(coalesce(b.current_period_start, now() - interval '1 month'), now() - interval '1 month');
  select count(*) into used from public.export_usage where workspace_id = _ws and created_at >= since;
  return jsonb_build_object('allowed', used < lim, 'reason', case when used < lim then null else 'limit_reached' end,
    'used', used, 'limit', lim, 'resets_at', b.current_period_end);
end $$;

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid,
  stamp text not null,
  channels text[] not null default '{}',
  formats text[] not null default '{}',
  total_bytes bigint not null default 0,
  status text not null default 'running',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, stamp)
);
grant select, insert, update on public.exports to authenticated;
grant all on public.exports to service_role;
alter table public.exports enable row level security;
create policy "Members manage exports" on public.exports for all to authenticated using (public.is_workspace_member(workspace_id::text)) with check (public.is_workspace_member(workspace_id::text));
create policy "Admins read" on public.exports for select to authenticated using (public.is_platform_admin());
create trigger exports_updated_at before update on public.exports for each row execute function public.set_updated_at();