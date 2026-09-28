-- Which workspace's paid plan covers _ws:
--   1. itself when paid, 2. the owner's best paid workspace,
--   3. a paid TEAM workspace the owner is a member of (teammate's personal workspace).
create or replace function public.billing_source(_ws uuid)
returns uuid language sql stable security definer set search_path = public as $$
  with paid as (
    select b.workspace_id, w.owner_id, b.plan, b.comp_plan,
           coalesce(nullif(b.comp_plan, ''), b.plan) as eff_plan,
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
    (select pd.workspace_id from paid pd
       join public.workspace_members m on m.workspace_id = pd.workspace_id
      where pd.eff_plan in ('team','team_yearly')
        and m.user_id = (select owner_id from public.workspaces where id = _ws)
      order by pd.seats desc, pd.amount_cents desc limit 1),
    _ws)
$$;
revoke execute on function public.billing_source(uuid) from public, anon;
grant execute on function public.billing_source(uuid) to authenticated;

-- Every workspace sharing one covering plan: the source, all workspaces of its owner,
-- and (for team plans) the personal workspaces of its members.
create or replace function public.billing_covered(_src uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with src as (select id, owner_id from public.workspaces where id = _src),
  is_team as (
    select exists (
      select 1 from public.workspace_billing b
       where b.workspace_id = _src
         and (coalesce(nullif(b.comp_plan, ''), b.plan) in ('team','team_yearly'))
         and ((b.comp_plan is not null and b.comp_until > now())
              or (b.status <> 'canceled' or b.current_period_end > now()))) as v
  )
  select w.id from public.workspaces w
   where w.id = _src
      or (w.owner_id is not null and w.owner_id = (select owner_id from src))
      or ((select v from is_team)
          and w.owner_id is not null
          and w.owner_id in (select m.user_id from public.workspace_members m where m.workspace_id = _src))
$$;
revoke execute on function public.billing_covered(uuid) from public, anon;
grant execute on function public.billing_covered(uuid) to authenticated;