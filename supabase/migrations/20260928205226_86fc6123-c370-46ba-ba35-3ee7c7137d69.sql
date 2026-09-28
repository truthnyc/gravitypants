CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Move existing staff over, then make every existing check read the roles table.
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin' FROM public.profiles WHERE is_platform_admin ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.brand_kits_enabled(_ws uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select public.is_platform_admin()
    or exists (select 1 from public.workspaces w where w.id = _ws and w.owner_id is not null and public.has_role(w.owner_id, 'admin'))
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = public.billing_source(_ws) and (
        (b.comp_plan is not null and b.comp_until > now())
        or (b.plan in ('simple','business','business_yearly','team','team_yearly')
            and (b.status <> 'canceled' or b.current_period_end > now()))))
$function$;

CREATE OR REPLACE FUNCTION public.workspace_is_team(_ws uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.workspaces w where w.id = _ws and w.owner_id is not null and public.has_role(w.owner_id, 'admin'))
    or exists (
      select 1 from public.workspace_billing b where b.workspace_id = public.billing_source(_ws) and (
        (b.comp_plan in ('team','team_yearly') and b.comp_until > now())
        or (b.plan in ('team','team_yearly') and (b.status <> 'canceled' or b.current_period_end > now()))))
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

-- Templates: system rows are staff-only to write; customers read published ones.
DROP POLICY IF EXISTS "Creator or admin edits templates" ON public.templates;
DROP POLICY IF EXISTS "Creator or admin deletes templates" ON public.templates;
DROP POLICY IF EXISTS "Members save templates" ON public.templates;
DROP POLICY IF EXISTS "Read own or team templates" ON public.templates;

CREATE POLICY "Read templates" ON public.templates FOR SELECT USING (
  (source = 'system' AND status = 'published')
  OR (source <> 'system' AND (
        (is_workspace_member((workspace_id)::text) AND (created_by = auth.uid() OR visibility = 'team'))
        OR has_support_session((workspace_id)::text)))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins write system templates" ON public.templates FOR ALL TO authenticated
  USING (source = 'system' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (source = 'system' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members save templates" ON public.templates FOR INSERT TO authenticated WITH CHECK (
  source <> 'system' AND is_workspace_member((workspace_id)::text) AND created_by = auth.uid() AND brand_kits_enabled(workspace_id)
  AND (visibility = 'private' OR (visibility = 'team' AND workspace_is_team(workspace_id)))
);
CREATE POLICY "Creator or admin edits templates" ON public.templates FOR UPDATE TO authenticated
  USING (source <> 'system' AND is_workspace_member((workspace_id)::text) AND (created_by = auth.uid() OR is_workspace_admin((workspace_id)::text)))
  WITH CHECK (source <> 'system' AND is_workspace_member((workspace_id)::text) AND (created_by = auth.uid() OR is_workspace_admin((workspace_id)::text))
    AND (visibility = 'private' OR (visibility = 'team' AND workspace_is_team(workspace_id))));
CREATE POLICY "Creator or admin deletes templates" ON public.templates FOR DELETE TO authenticated
  USING (source <> 'system' AND is_workspace_member((workspace_id)::text) AND (created_by = auth.uid() OR is_workspace_admin((workspace_id)::text)));

ALTER TABLE public.profiles DROP COLUMN is_platform_admin;