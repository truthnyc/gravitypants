ALTER TABLE public.site_reels ADD COLUMN brand_id uuid REFERENCES public.directory_brands(id) ON DELETE SET NULL;
CREATE INDEX site_reels_brand_id_idx ON public.site_reels(brand_id);
ALTER TABLE public.directory_brands ADD COLUMN is_editorial boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.brand_visible(_brand uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select coalesce(is_editorial or public.directory_effective_plan(workspace_id) is not null
    or (plan_ended_at is not null and plan_ended_at > now() - interval '30 days'), false)
  from public.directory_brands where id = _brand
$function$;