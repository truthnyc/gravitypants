ALTER TABLE public.workspace_billing DROP CONSTRAINT workspace_billing_plan_check;
ALTER TABLE public.workspace_billing ADD CONSTRAINT workspace_billing_plan_check
  CHECK (plan = ANY (ARRAY['trial','simple','simple_yearly','business','business_yearly','team','team_yearly','none']));
UPDATE public.plans SET sort_order = sort_order + 1 WHERE id IN ('business','business_yearly','team','team_yearly');
INSERT INTO public.plans (id, name, price_id, amount_cents, interval, monthly_exports, sort_order, seats)
VALUES ('simple_yearly','Simple Yearly','simple_yearly',35000,'year',10,2,1)
ON CONFLICT (id) DO UPDATE SET amount_cents = excluded.amount_cents, monthly_exports = excluded.monthly_exports;

CREATE OR REPLACE FUNCTION public.billing_source(_ws uuid)
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  with paid as (
    select b.workspace_id, w.owner_id, b.plan, b.comp_plan,
           coalesce(nullif(b.comp_plan, ''), b.plan) as eff_plan,
           coalesce(p.seats, 1) as seats, coalesce(p.amount_cents, 0) as amount_cents
      from public.workspace_billing b
      join public.workspaces w on w.id = b.workspace_id
      left join public.plans p on p.id = coalesce(nullif(b.comp_plan, ''), b.plan)
     where (b.comp_plan is not null and b.comp_until > now())
        or (b.plan in ('simple','simple_yearly','business','business_yearly','team','team_yearly')
            and (b.status <> 'canceled' or b.current_period_end > now()))
  )
  select coalesce(
    (select workspace_id from paid where workspace_id = _ws),
    (select workspace_id from paid
      where owner_id is not null
        and owner_id = (select owner_id from public.workspaces where id = _ws)
      order by seats desc, amount_cents desc limit 1),
    (select pd.workspace_id from paid pd
       join public.workspace_members m on m.workspace_id = pd.workspace_id
      where pd.eff_plan in ('team','team_yearly')
        and m.user_id = (select owner_id from public.workspaces where id = _ws)
      order by pd.seats desc, pd.amount_cents desc limit 1),
    _ws)
$function$;

CREATE OR REPLACE FUNCTION public.brand_kits_enabled(_ws uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select public.is_platform_admin()
    or exists (select 1 from public.workspaces w where w.id = _ws and w.owner_id is not null and public.has_role(w.owner_id, 'admin'))
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = public.billing_source(_ws) and (
        (b.comp_plan is not null and b.comp_until > now())
        or (b.plan = 'trial' and b.status = 'trialing')
        or (b.plan in ('simple','simple_yearly','business','business_yearly','team','team_yearly')
            and (b.status <> 'canceled' or b.current_period_end > now()))))
$function$;

CREATE OR REPLACE FUNCTION public.export_status(_ws uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare b public.workspace_billing; w public.workspaces; src uuid; lim int; used int := 0; since timestamptz; eff text;
begin
  if not public.is_workspace_member(_ws::text) and not public.has_support_session(_ws::text) then
    return jsonb_build_object('allowed', false, 'reason', 'no_access'); end if;
  select * into w from public.workspaces where id = _ws;
  if w.suspended_at is not null then return jsonb_build_object('allowed', false, 'reason', 'suspended'); end if;
  if w.owner_id is not null and public.has_role(w.owner_id, 'admin') then
    return jsonb_build_object('allowed', true, 'reason', null); end if;
  src := public.billing_source(_ws);
  select * into b from public.workspace_billing where workspace_id = src;
  if b.comp_plan is not null and b.comp_until > now() then
    eff := b.comp_plan;
  else
    if b.workspace_id is null or b.plan in ('trial','none') then
      if b.workspace_id is not null and b.plan = 'trial' and b.status = 'trialing' then
        select count(*) into used from public.export_usage where workspace_id in (select public.billing_covered(src));
        return jsonb_build_object('allowed', used < 3 or b.extra_exports > 0, 'reason', case when used < 3 or b.extra_exports > 0 then null else 'limit_reached' end,
          'used', used, 'limit', 3, 'trial', true, 'watermark', used >= 1 and b.extra_exports <= 0, 'clean_left', greatest(1 - used, 0), 'extras', b.extra_exports);
      end if;
      if b.workspace_id is not null and b.extra_exports > 0 then
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