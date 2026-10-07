ALTER TABLE public.export_usage ADD COLUMN IF NOT EXISTS watermarked boolean NOT NULL DEFAULT false;

-- Backfill: in trial workspaces, every export after the first was watermarked.
UPDATE public.export_usage u SET watermarked = true
FROM (
  SELECT eu.id, row_number() OVER (PARTITION BY public.billing_source(eu.workspace_id) ORDER BY eu.created_at) rn
  FROM public.export_usage eu
  JOIN public.workspace_billing b ON b.workspace_id = public.billing_source(eu.workspace_id)
  WHERE b.plan = 'trial'
) x WHERE x.id = u.id AND x.rn > 1;

CREATE OR REPLACE FUNCTION private.record_export(_ws uuid, _project uuid, _stamp text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
declare st jsonb;
begin
  if exists (select 1 from public.export_usage where workspace_id = _ws and stamp = _stamp) then return true; end if;
  st := public.export_status(_ws);
  if not coalesce((st ->> 'allowed')::boolean, false) then return false; end if;
  insert into public.export_usage (workspace_id, project_id, stamp, watermarked)
    values (_ws, _project, _stamp, coalesce((st ->> 'watermark')::boolean, false));
  if (st ->> 'limit') is not null and coalesce((st ->> 'used')::int, 0) >= (st ->> 'limit')::int then
    update public.workspace_billing set extra_exports = greatest(extra_exports - 1, 0)
     where workspace_id = public.billing_source(_ws) and extra_exports > 0;
  end if;
  return true;
end $function$;

-- Trial workspaces count as listable brands.
CREATE OR REPLACE FUNCTION private.brand_visible(_brand uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
  select coalesce(d.status = 'live' and (d.is_editorial or public.directory_effective_plan(d.workspace_id) is not null
    or exists (select 1 from public.workspace_billing b where b.workspace_id = public.billing_source(d.workspace_id) and b.plan = 'trial' and b.status = 'trialing')
    or (d.plan_ended_at is not null and d.plan_ended_at > now() - interval '30 days')), false)
  from public.directory_brands d where d.id = _brand
$function$;

-- Listing rules, enforced in the database: watermark-free only; 3 listed reels without a paid plan.
CREATE OR REPLACE FUNCTION private.reel_listing_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare ws uuid; listed int;
begin
  if new.status not in ('live','in_review') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('live','in_review') and old.ad_id = new.ad_id then return new; end if;
  if auth.uid() is null or public.is_platform_admin() then return new; end if;
  select workspace_id into ws from public.directory_brands where id = new.brand_id;
  if exists (select 1 from public.directory_brands where id = new.brand_id and is_editorial) then return new; end if;
  if not exists (select 1 from public.export_usage where project_id = new.ad_id and not watermarked) then
    raise exception 'LISTING_WATERMARK: Only watermark-free reels can be added to your brand page.';
  end if;
  if public.directory_effective_plan(ws) is null then
    select count(*) into listed from public.directory_reels
      where brand_id = new.brand_id and status in ('live','in_review') and id <> new.id;
    if listed >= 3 then
      raise exception 'LISTING_LIMIT: Free trial brand pages show up to 3 reels.';
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.reel_listing_guard()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$ begin return private.reel_listing_guard_row(new, old, tg_op); end $function$;
DROP FUNCTION public.reel_listing_guard();

DROP TRIGGER IF EXISTS reel_listing_guard ON public.directory_reels;
CREATE TRIGGER reel_listing_guard BEFORE INSERT OR UPDATE ON public.directory_reels
  FOR EACH ROW EXECUTE FUNCTION private.reel_listing_guard();
REVOKE ALL ON FUNCTION private.reel_listing_guard() FROM PUBLIC, anon, authenticated;