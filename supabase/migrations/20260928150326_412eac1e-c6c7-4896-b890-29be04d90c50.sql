-- Which workspace's paid plan covers _ws: itself when paid, otherwise the owner's best paid workspace.
create or replace function public.billing_source(_ws uuid)
returns uuid language sql stable security definer set search_path = public as $$
  with paid as (
    select b.workspace_id, w.owner_id, b.plan, b.comp_plan,
           coalesce(p.seats, 1) as seats, coalesce(p.amount_cents, 0) as amount_cents
      from public.workspace_billing b
      join public.workspaces w on w.id = b.workspace_id
      left join public.plans p on p.id = coalesce(nullif(b.comp_plan, ''), b.plan)
     where (b.comp_plan is not null and b.comp_until > now())
        or (b.plan in ('simple','business','business_yearly','team','team_yearly')
            and (b.status <> 'canceled' or b.current_period_end > now()))
  )
  select coalesce(
    (select workspace_id from paid where workspace_id = _ws),
    (select workspace_id from paid
      where owner_id is not null
        and owner_id = (select owner_id from public.workspaces where id = _ws)
      order by seats desc, amount_cents desc limit 1),
    _ws)
$$;
revoke execute on function public.billing_source(uuid) from public, anon;
grant execute on function public.billing_source(uuid) to authenticated;

-- Every workspace that shares one covering plan (the source and all workspaces of its owner).
create or replace function public.billing_covered(_src uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select w.id from public.workspaces w
   where w.id = _src
      or (w.owner_id is not null and w.owner_id = (select owner_id from public.workspaces where id = _src))
$$;
revoke execute on function public.billing_covered(uuid) from public, anon;
grant execute on function public.billing_covered(uuid) to authenticated;

create or replace function public.brand_kits_enabled(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
    or exists (select 1 from public.workspaces w join public.profiles p on p.user_id = w.owner_id where w.id = _ws and p.is_platform_admin)
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = public.billing_source(_ws) and (
        (b.comp_plan is not null and b.comp_until > now())
        or (b.plan in ('simple','business','business_yearly','team','team_yearly')
            and (b.status <> 'canceled' or b.current_period_end > now()))))
$$;

create or replace function public.workspace_is_team(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w join public.profiles p on p.user_id = w.owner_id where w.id = _ws and p.is_platform_admin)
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = public.billing_source(_ws) and (
        (b.comp_plan in ('team','team_yearly') and b.comp_until > now())
        or (b.plan in ('team','team_yearly') and (b.status <> 'canceled' or b.current_period_end > now()))))
$$;

create or replace function public.workspace_seats(_ws uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select p.seats from public.workspace_billing b join public.plans p on p.id = b.plan
                    where b.workspace_id = public.billing_source(_ws)), 1)
$$;

create or replace function public.export_status(_ws uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $function$
declare b public.workspace_billing; w public.workspaces; src uuid; lim int; used int := 0; since timestamptz; eff text;
begin
  if not public.is_workspace_member(_ws::text) and not public.has_support_session(_ws::text) then
    return jsonb_build_object('allowed', false, 'reason', 'no_access'); end if;
  select * into w from public.workspaces where id = _ws;
  if w.suspended_at is not null then return jsonb_build_object('allowed', false, 'reason', 'suspended'); end if;
  if exists (select 1 from public.profiles where user_id = w.owner_id and is_platform_admin) then
    return jsonb_build_object('allowed', true, 'reason', null); end if;
  src := public.billing_source(_ws);
  select * into b from public.workspace_billing where workspace_id = src;
  if b.comp_plan is not null and b.comp_until > now() then
    eff := b.comp_plan;
  else
    if b is null or b.plan in ('trial','none') then
      if b is not null and b.plan = 'trial' and b.status = 'trialing' and b.trial_ends_at > now() then
        select count(*) into used from public.export_usage where workspace_id in (select public.billing_covered(src));
        return jsonb_build_object('allowed', used < 3 or b.extra_exports > 0, 'reason', case when used < 3 or b.extra_exports > 0 then null else 'limit_reached' end,
          'used', used, 'limit', 3, 'watermark', true, 'extras', b.extra_exports);
      end if;
      if b is not null and b.extra_exports > 0 then
        return jsonb_build_object('allowed', true, 'reason', null, 'extras', b.extra_exports); end if;
      return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
    if b.status = 'past_due' then return jsonb_build_object('allowed', false, 'reason', 'payment_problem'); end if;
    if b.status = 'canceled' and (b.current_period_end is null or b.current_period_end < now()) then
      if b.extra_exports > 0 then return jsonb_build_object('allowed', true, 'reason', null, 'extras', b.extra_exports); end if;
      return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
    eff := b.plan;
  end if;
  select monthly_exports into lim from public.plans where id = eff;
  if lim is null then return jsonb_build_object('allowed', true, 'reason', null, 'extras', b.extra_exports); end if;
  since := greatest(coalesce(b.current_period_start, now() - interval '1 month'), now() - interval '1 month');
  select count(*) into used from public.export_usage where workspace_id in (select public.billing_covered(src)) and created_at >= since;
  return jsonb_build_object('allowed', used < lim or b.extra_exports > 0, 'reason', case when used < lim or b.extra_exports > 0 then null else 'limit_reached' end,
    'used', used, 'limit', lim, 'resets_at', b.current_period_end, 'extras', b.extra_exports);
end $function$;

create or replace function public.record_export(_ws uuid, _project uuid, _stamp text)
returns boolean language plpgsql security definer set search_path = public as $function$
declare st jsonb;
begin
  if exists (select 1 from public.export_usage where workspace_id = _ws and stamp = _stamp) then return true; end if;
  st := public.export_status(_ws);
  if not coalesce((st ->> 'allowed')::boolean, false) then return false; end if;
  insert into public.export_usage (workspace_id, project_id, stamp) values (_ws, _project, _stamp);
  -- Spend one extra export when the covering plan's own allowance is already used up.
  if (st ->> 'limit') is not null and coalesce((st ->> 'used')::int, 0) >= (st ->> 'limit')::int then
    update public.workspace_billing set extra_exports = greatest(extra_exports - 1, 0)
     where workspace_id = public.billing_source(_ws) and extra_exports > 0;
  end if;
  return true;
end $function$;

-- Plan a workspace actually runs on, including the workspace that pays for it.
create or replace function public.effective_billing(_ws uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $function$
declare src uuid; b public.workspace_billing; nm text;
begin
  if not public.is_workspace_member(_ws::text) and not public.has_support_session(_ws::text) and not public.is_platform_admin() then
    return null; end if;
  src := public.billing_source(_ws);
  select * into b from public.workspace_billing where workspace_id = src;
  if b is null then return null; end if;
  select name into nm from public.workspaces where id = src;
  return to_jsonb(b) || jsonb_build_object(
    'workspace_id', _ws,
    'source_workspace_id', src,
    'source_workspace_name', nm,
    'inherited', src is distinct from _ws);
end $function$;
revoke execute on function public.effective_billing(uuid) from public, anon;
grant execute on function public.effective_billing(uuid) to authenticated;