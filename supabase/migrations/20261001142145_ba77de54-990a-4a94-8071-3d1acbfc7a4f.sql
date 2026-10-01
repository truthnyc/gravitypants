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
    return jsonb_build_object('allowed', true, 'reason', null, 'staff', true,
      'extras', coalesce((select extra_exports from public.workspace_billing where workspace_id = public.billing_source(_ws)), 0)); end if;
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