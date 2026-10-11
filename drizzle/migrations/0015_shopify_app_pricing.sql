ALTER TABLE public.shopify_shops
  ADD COLUMN IF NOT EXISTS shop_gid text,
  ADD COLUMN IF NOT EXISTS plan_handle text NOT NULL DEFAULT 'free' CHECK (plan_handle IN ('free','simple','business','team')),
  ADD COLUMN IF NOT EXISTS billing_period text,
  ADD COLUMN IF NOT EXISTS plan_cycle_start timestamptz,
  ADD COLUMN IF NOT EXISTS plan_cycle_end timestamptz,
  ADD COLUMN IF NOT EXISTS plan_cancel_at_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS upgrade_return_project uuid;

-- A Shopify shop linked to a paying gravitypants.com account uses that account's plan.
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
    (select pd.workspace_id from paid pd
       join public.shopify_shops s on s.workspace_id = _ws and s.billing_source = 'web' and s.linked_user_id is not null
       join public.workspace_members m on m.workspace_id = pd.workspace_id and m.user_id = s.linked_user_id
      where pd.workspace_id <> _ws
      order by pd.seats desc, pd.amount_cents desc limit 1),
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