-- Run with a privileged database test connection. Fixtures never persist or send email.
BEGIN;
DO $$
DECLARE rid uuid; bid uuid; aid uuid; cat text; names text[];
BEGIN
  SELECT user_id INTO aid FROM public.user_roles WHERE role='admin' LIMIT 1;
  SELECT name INTO cat FROM public.categories LIMIT 1;
  SELECT array_agg(name) INTO names FROM (SELECT name FROM public.moods ORDER BY name LIMIT 6) m;
  INSERT INTO public.brand_requests(name,email,brand,website,category,description,moods,status)
    VALUES('Monitoring test','monitoring@example.com','Monitoring rollback brand','https://monitoring-'||gen_random_uuid()::text||'.example.com',cat,'Rollback-only approval verification',names,'pending') RETURNING id INTO rid;
  bid := public.approve_brand_request(rid,aid,NULL);
  IF (SELECT count(*) FROM public.brand_moods WHERE brand_id=bid)<>6 THEN RAISE EXCEPTION 'Expected six brand mood links'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.directory_brands WHERE id=bid AND moods=names AND status='draft') THEN RAISE EXCEPTION 'Expected draft with six moods'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.brand_requests WHERE id=rid AND status='approved' AND created_brand_id=bid) THEN RAISE EXCEPTION 'Expected approved request linked to brand'; END IF;
END $$;
ROLLBACK;