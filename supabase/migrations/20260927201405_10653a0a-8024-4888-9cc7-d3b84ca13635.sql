create table public.plans (
  id text primary key,
  name text not null,
  price_id text not null unique,
  amount_cents integer not null,
  interval text not null,
  monthly_exports integer,
  sort_order integer not null default 0
);
grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "Anyone reads plans" on public.plans for select to anon, authenticated using (true);
insert into public.plans (id,name,price_id,amount_cents,interval,monthly_exports,sort_order) values
 ('simple','Simple','simple_monthly',3500,'month',2,1),
 ('business','Business','business_monthly',12500,'month',null,2),
 ('business_yearly','Business Yearly','business_yearly',125000,'year',null,3);

create table public.workspace_billing (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  environment text not null default 'sandbox',
  plan text not null default 'trial' check (plan in ('trial','simple','business','business_yearly','none')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled')),
  trial_ends_at timestamptz not null default now() + interval '15 days',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.workspace_billing to authenticated;
grant all on public.workspace_billing to service_role;
alter table public.workspace_billing enable row level security;
create policy "Members read billing" on public.workspace_billing for select to authenticated using (public.is_workspace_member(workspace_id::text));
create trigger workspace_billing_updated_at before update on public.workspace_billing for each row execute function public.set_updated_at();

create table public.export_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid,
  stamp text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, stamp)
);
grant select on public.export_usage to authenticated;
grant all on public.export_usage to service_role;
alter table public.export_usage enable row level security;
create policy "Members read usage" on public.export_usage for select to authenticated using (public.is_workspace_member(workspace_id::text));

insert into public.workspace_billing (workspace_id) select id from public.workspaces on conflict do nothing;

create or replace function public.create_workspace_billing() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.workspace_billing (workspace_id) values (new.id) on conflict do nothing; return new; end $$;
create trigger workspaces_billing after insert on public.workspaces for each row execute function public.create_workspace_billing();

-- Returns {allowed, reason, used, limit, resets_at}
create or replace function public.export_status(_ws uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare b public.workspace_billing; lim int; used int := 0; since timestamptz;
begin
  if not public.is_workspace_member(_ws::text) then return jsonb_build_object('allowed', false, 'reason', 'no_access'); end if;
  select * into b from public.workspace_billing where workspace_id = _ws;
  if b is null or b.plan in ('trial','none') then return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
  if b.status = 'past_due' then return jsonb_build_object('allowed', false, 'reason', 'payment_problem'); end if;
  if b.status = 'canceled' and (b.current_period_end is null or b.current_period_end < now()) then
    return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
  select monthly_exports into lim from public.plans where id = b.plan;
  if lim is null then return jsonb_build_object('allowed', true, 'reason', null); end if;
  since := coalesce(b.current_period_start, now() - interval '1 month');
  select count(*) into used from public.export_usage where workspace_id = _ws and created_at >= since;
  return jsonb_build_object('allowed', used < lim, 'reason', case when used < lim then null else 'limit_reached' end,
    'used', used, 'limit', lim, 'resets_at', b.current_period_end);
end $$;

-- Records one counted export (idempotent per stamp); refuses when not allowed.
create or replace function public.record_export(_ws uuid, _project uuid, _stamp text) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.export_usage where workspace_id = _ws and stamp = _stamp) then return true; end if;
  if not coalesce((public.export_status(_ws) ->> 'allowed')::boolean, false) then return false; end if;
  insert into public.export_usage (workspace_id, project_id, stamp) values (_ws, _project, _stamp);
  return true;
end $$;

create or replace function public.can_save_export(_ws text, _stamp text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.export_usage where workspace_id::text = _ws and stamp = _stamp)
      or coalesce((public.export_status(_ws::uuid) ->> 'allowed')::boolean, false)
$$;

create policy "Exports need a plan" on storage.objects as restrictive for insert to authenticated
with check (
  bucket_id <> 'media' or coalesce((storage.foldername(name))[2], '') <> 'exports'
  or public.can_save_export((storage.foldername(name))[1], (storage.foldername(name))[4])
);