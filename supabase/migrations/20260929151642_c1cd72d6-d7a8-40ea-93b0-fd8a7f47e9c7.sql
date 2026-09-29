CREATE OR REPLACE FUNCTION public.brand_kits_enabled(_ws uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select public.is_platform_admin()
    or exists (select 1 from public.workspaces w where w.id = _ws and w.owner_id is not null and public.has_role(w.owner_id, 'admin'))
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = public.billing_source(_ws) and (
        (b.comp_plan is not null and b.comp_until > now())
        or (b.plan = 'trial' and b.status = 'trialing' and b.trial_ends_at > now())
        or (b.plan in ('simple','business','business_yearly','team','team_yearly')
            and (b.status <> 'canceled' or b.current_period_end > now()))))
$function$;