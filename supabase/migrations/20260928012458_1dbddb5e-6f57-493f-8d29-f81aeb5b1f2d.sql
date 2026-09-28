alter table public.workspace_billing drop constraint workspace_billing_plan_check;
alter table public.workspace_billing add constraint workspace_billing_plan_check
  check (plan = any (array['trial','simple','business','business_yearly','team','team_yearly','none']));