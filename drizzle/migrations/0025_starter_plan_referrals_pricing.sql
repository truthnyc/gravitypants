-- New Starter plan, Business 30 exports for new subscribers, Free plan 6 exports, referral credits.
alter table public.workspace_billing drop constraint workspace_billing_plan_check;
alter table public.workspace_billing add constraint workspace_billing_plan_check check (plan = any (array['trial','starter','starter_yearly','simple','simple_yearly','business','business_yearly','team','team_yearly','none']));
alter table public.workspace_billing add column if not exists referral_credits integer not null default 0;

insert into public.plans (id, name, price_id, amount_cents, interval, monthly_exports, sort_order, seats) values
  ('starter', 'Starter', 'starter_monthly', 1900, 'month', 5, 0, 1),
  ('starter_yearly', 'Starter Yearly', 'starter_yearly', 19000, 'year', 5, 0, 1)
on conflict (id) do update set amount_cents = excluded.amount_cents, monthly_exports = excluded.monthly_exports, price_id = excluded.price_id;
update public.plans set amount_cents = 7900, monthly_exports = 30 where id = 'business';
update public.plans set amount_cents = 79000, monthly_exports = 30 where id = 'business_yearly';

-- Every function that lists paid plans also covers Starter.
do $$
declare r record; def text;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public','private') and p.prokind = 'f' and p.prosrc like '%''simple'',''simple_yearly''%' loop
    def := pg_get_functiondef(r.oid);
    def := replace(def, '''simple'',''simple_yearly''', '''starter'',''starter_yearly'',''simple'',''simple_yearly''');
    execute def;
  end loop;
end $$;

-- Referral codes and the record of who referred whom.
alter table public.profiles add column if not exists referral_code text unique;

create table public.referrals (
  referred_user_id uuid primary key,
  referrer_user_id uuid not null,
  credited_workspace_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
create policy "Referrers see their own referrals" on public.referrals for select to authenticated using (referrer_user_id = auth.uid());

create or replace function private.export_status(_ws uuid)
 returns jsonb language plpgsql stable security definer
 set search_path to 'pg_catalog', 'public', 'extensions', 'pg_temp'
as $function$
declare b public.workspace_billing; w public.workspaces; src uuid; lim int; used int := 0; since timestamptz; eff text; rc int; ok boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_workspace_member(_ws::text) and not public.has_support_session(_ws::text) then
    return jsonb_build_object('allowed', false, 'reason', 'no_access'); end if;
  select * into w from public.workspaces where id = _ws;
  if w.suspended_at is not null then return jsonb_build_object('allowed', false, 'reason', 'suspended'); end if;
  if w.owner_id is not null and public.has_role(w.owner_id, 'admin') then
    return jsonb_build_object('allowed', true, 'reason', null, 'staff', true,
      'extras', coalesce((select extra_exports from public.workspace_billing where workspace_id = public.billing_source(_ws)), 0)); end if;
  src := public.billing_source(_ws);
  select * into b from public.workspace_billing where workspace_id = src;
  rc := coalesce(b.referral_credits, 0);
  if b.comp_plan is not null and b.comp_until > now() then
    eff := b.comp_plan;
  else
    if b.workspace_id is null or b.plan in ('trial','none') then
      if b.workspace_id is not null and b.plan = 'trial' and b.status = 'trialing' then
        select count(*) into used from public.export_usage where workspace_id in (select public.billing_covered(src));
        ok := used < 6 or b.extra_exports > 0 or rc > 0;
        return jsonb_build_object('allowed', ok, 'reason', case when ok then null else 'limit_reached' end,
          'used', used, 'limit', 6, 'trial', true, 'watermark', used >= 1 and b.extra_exports <= 0 and rc <= 0,
          'clean_left', greatest(1 - used, 0) + rc, 'extras', b.extra_exports, 'referral_credits', rc);
      end if;
      if b.workspace_id is not null and (b.extra_exports > 0 or rc > 0) then
        return jsonb_build_object('allowed', true, 'reason', null, 'extras', b.extra_exports, 'referral_credits', rc); end if;
      return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
    if b.status = 'past_due' then return jsonb_build_object('allowed', false, 'reason', 'payment_problem'); end if;
    if b.status = 'canceled' and (b.current_period_end is null or b.current_period_end < now()) then
      if b.extra_exports > 0 or rc > 0 then return jsonb_build_object('allowed', true, 'reason', null, 'extras', b.extra_exports, 'referral_credits', rc); end if;
      return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
    eff := b.plan;
  end if;
  select monthly_exports into lim from public.plans where id = eff;
  if lim is null then return jsonb_build_object('allowed', true, 'reason', null, 'extras', b.extra_exports, 'referral_credits', rc); end if;
  since := greatest(coalesce(b.current_period_start, now() - interval '1 month'), now() - interval '1 month');
  select count(*) into used from public.export_usage where workspace_id in (select public.billing_covered(src)) and created_at >= since;
  ok := used < lim or b.extra_exports > 0 or rc > 0;
  return jsonb_build_object('allowed', ok, 'reason', case when ok then null else 'limit_reached' end,
    'used', used, 'limit', lim, 'resets_at', b.current_period_end, 'extras', b.extra_exports, 'referral_credits', rc);
end $function$;

create or replace function private.record_export(_ws uuid, _project uuid, _stamp text)
 returns boolean language plpgsql security definer
 set search_path to 'pg_catalog', 'public', 'extensions', 'pg_temp'
as $function$
declare st jsonb; used int; lim int; rc int; src uuid; owner uuid; ref text; referrer uuid; target uuid;
begin
  if exists (select 1 from public.export_usage where workspace_id = _ws and stamp = _stamp) then return true; end if;
  st := public.export_status(_ws);
  if not coalesce((st ->> 'allowed')::boolean, false) then return false; end if;
  insert into public.export_usage (workspace_id, project_id, stamp, watermarked)
    values (_ws, _project, _stamp, coalesce((st ->> 'watermark')::boolean, false));
  src := public.billing_source(_ws);
  used := coalesce((st ->> 'used')::int, 0);
  lim := (st ->> 'limit')::int;
  rc := coalesce((st ->> 'referral_credits')::int, 0);
  if coalesce((st ->> 'trial')::boolean, false) and used >= 1 and rc > 0 then
    -- Referral credit turns a watermarked Free export into a clean one.
    update public.workspace_billing set referral_credits = referral_credits - 1 where workspace_id = src and referral_credits > 0;
  elsif lim is null or used >= lim then
    if rc > 0 then
      update public.workspace_billing set referral_credits = referral_credits - 1 where workspace_id = src and referral_credits > 0;
    elsif lim is not null then
      update public.workspace_billing set extra_exports = greatest(extra_exports - 1, 0) where workspace_id = src and extra_exports > 0;
    end if;
  end if;

  -- First export by a referred person earns their referrer one clean export.
  select owner_id into owner from public.workspaces where id = _ws;
  if owner is not null and not exists (select 1 from public.referrals where referred_user_id = owner)
     and (select count(*) from public.export_usage u join public.workspaces w on w.id = u.workspace_id where w.owner_id = owner) = 1 then
    select signup_ref into ref from public.profiles where user_id = owner;
    if ref like 'r-%' then
      select user_id into referrer from public.profiles where referral_code = substr(ref, 3);
      if referrer is not null and referrer <> owner then
        select id into target from public.workspaces where owner_id = referrer order by created_at limit 1;
        insert into public.referrals (referred_user_id, referrer_user_id, credited_workspace_id) values (owner, referrer, target)
          on conflict do nothing;
        if found and target is not null then
          update public.workspace_billing set referral_credits = referral_credits + 1 where workspace_id = target;
        end if;
      end if;
    end if;
  end if;
  return true;
end $function$;

create or replace function private.my_referral()
 returns jsonb language plpgsql security definer
 set search_path to 'pg_catalog', 'public', 'extensions', 'pg_temp'
as $function$
declare uid uuid := auth.uid(); code text; credits int; n int;
begin
  if uid is null then return null; end if;
  insert into public.profiles (user_id) values (uid) on conflict do nothing;
  select referral_code into code from public.profiles where user_id = uid;
  if code is null then
    loop
      code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      begin
        update public.profiles set referral_code = code where user_id = uid;
        exit;
      exception when unique_violation then null;
      end;
    end loop;
  end if;
  select coalesce(b.referral_credits, 0) into credits from public.workspaces w join public.workspace_billing b on b.workspace_id = w.id
   where w.owner_id = uid order by w.created_at limit 1;
  select count(*) into n from public.referrals where referrer_user_id = uid;
  return jsonb_build_object('code', code, 'credits', coalesce(credits, 0), 'referred', n);
end $function$;

create or replace function public.my_referral()
 returns jsonb language plpgsql security invoker
 set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$ begin return private.my_referral(); end $function$;
revoke all on function public.my_referral() from public, anon;
grant execute on function public.my_referral() to authenticated;
grant execute on function private.my_referral() to authenticated;