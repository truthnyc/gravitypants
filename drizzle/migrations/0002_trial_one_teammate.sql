CREATE OR REPLACE FUNCTION private.workspace_seats(_ws uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
  select coalesce((select coalesce(p.seats, case when b.status = 'trial' then 2 end)
                     from public.workspace_billing b left join public.plans p on p.id = b.plan
                    where b.workspace_id = public.billing_source(_ws)), 1)
$function$;