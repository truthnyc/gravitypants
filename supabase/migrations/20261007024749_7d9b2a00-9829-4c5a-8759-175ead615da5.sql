DO $$
DECLARE b public.directory_brands;
BEGIN
 SELECT * INTO b FROM public.directory_brands WHERE id='fb949ba0-85dc-46cb-aa43-15c4ea4364ef' AND name='Purl Soho';
 IF b.id IS NOT NULL AND b.slug='gravitypants' THEN
  IF EXISTS (SELECT 1 FROM public.directory_brands WHERE slug='purl-soho' AND id<>b.id) THEN RAISE EXCEPTION 'Purl Soho address is already taken'; END IF;
  INSERT INTO public.directory_slug_history(brand_id,old_slug) VALUES(b.id,b.slug);
  UPDATE public.directory_brands SET slug='purl-soho' WHERE id=b.id;
 END IF;
END $$;
DROP POLICY IF EXISTS "Anyone can log greeting events" ON public.directory_greeting_log;
REVOKE INSERT ON public.directory_greeting_log FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.guard_brand_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.is_platform_admin() THEN
  NEW.first_approved_at := OLD.first_approved_at;
  NEW.affiliated := OLD.affiliated;
  NEW.is_editorial := OLD.is_editorial;
  NEW.workspace_id := OLD.workspace_id;
 END IF;
 RETURN NEW;
END $$;