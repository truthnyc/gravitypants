-- Business accounts that existed before the 2026-11 price change keep 50 exports a month.
alter table public.workspace_billing add column if not exists grandfathered_exports integer;
update public.workspace_billing set grandfathered_exports = 50
 where plan in ('business','business_yearly') or (comp_plan in ('business','business_yearly') and comp_until > now());

do $$
declare def text;
begin
  def := pg_get_functiondef('private.export_status(uuid)'::regprocedure);
  def := replace(def,
    'select monthly_exports into lim from public.plans where id = eff;',
    'select monthly_exports into lim from public.plans where id = eff;
  if eff in (''business'',''business_yearly'') and b.grandfathered_exports is not null then lim := b.grandfathered_exports; end if;');
  execute def;
end $$;