ALTER TABLE public.brand_requests ADD COLUMN needs_info_at timestamptz;
ALTER TABLE public.brand_requests ADD COLUMN website_key text GENERATED ALWAYS AS (lower(regexp_replace(split_part(split_part(regexp_replace(coalesce(website,''), '^https?://', '', 'i'), '/', 1), '?', 1), '^www\.', '', 'i'))) STORED;
CREATE UNIQUE INDEX brand_requests_application_website_unique ON public.brand_requests(website_key) WHERE category IS NOT NULL AND website_key <> '';
DROP POLICY "Anyone can send a request" ON public.brand_requests;
REVOKE ALL ON public.brand_requests FROM anon;
REVOKE INSERT,DELETE ON public.brand_requests FROM authenticated;
GRANT SELECT,UPDATE ON public.brand_requests TO authenticated;
GRANT ALL ON public.brand_requests TO service_role;
CREATE TABLE public.brand_request_limits(visitor_hash text PRIMARY KEY, window_started_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.brand_request_limits TO service_role;
ALTER TABLE public.brand_request_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.consume_brand_request_limit(_visitor_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 IF _visitor_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid visitor'; END IF;
 INSERT INTO public.brand_request_limits(visitor_hash) VALUES (_visitor_hash)
 ON CONFLICT(visitor_hash) DO UPDATE SET attempts=CASE WHEN brand_request_limits.window_started_at <= now()-interval '1 hour' THEN 1 ELSE brand_request_limits.attempts+1 END,
 window_started_at=CASE WHEN brand_request_limits.window_started_at <= now()-interval '1 hour' THEN now() ELSE brand_request_limits.window_started_at END, updated_at=now()
 RETURNING attempts INTO n;
 DELETE FROM public.brand_request_limits WHERE updated_at < now()-interval '24 hours';
 RETURN n <= 3;
END $$;
REVOKE ALL ON FUNCTION public.consume_brand_request_limit(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_brand_request_limit(text) TO service_role;
ALTER FUNCTION public.approve_brand_request(uuid,uuid,text) SET SCHEMA private;
CREATE OR REPLACE FUNCTION private.approve_brand_request(_request_id uuid,_admin_id uuid,_admin_note text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE req public.brand_requests%ROWTYPE; bid uuid; wid uuid; base_slug text; slug_value text; suffix integer:=1; cid uuid;
BEGIN
 IF NOT private.has_role(_admin_id,'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO req FROM public.brand_requests WHERE id=_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF req.status='approved' AND req.created_brand_id IS NOT NULL THEN RETURN req.created_brand_id; END IF;
 IF req.status<>'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
 SELECT id INTO cid FROM public.categories WHERE name=req.category;
 IF cid IS NULL OR req.description IS NULL OR cardinality(req.moods) NOT BETWEEN 1 AND 3 OR (SELECT count(*) FROM public.moods WHERE name=ANY(req.moods))<>cardinality(req.moods) THEN RAISE EXCEPTION 'Request profile is incomplete'; END IF;
 base_slug:=trim(both '-' from regexp_replace(lower(unaccent(req.brand)),'[^a-z0-9]+','-','g'));
 IF length(base_slug)<3 THEN base_slug:='brand'; END IF;
 slug_value:=left(base_slug,30);
 WHILE EXISTS(SELECT 1 FROM public.directory_brands WHERE slug=slug_value) OR EXISTS(SELECT 1 FROM public.directory_slug_history WHERE old_slug=slug_value) LOOP
 suffix:=suffix+1; slug_value:=left(base_slug,30-length(suffix::text)-1)||'-'||suffix::text;
 END LOOP;
 INSERT INTO public.workspaces(name,owner_id) VALUES('Editorial · '||req.brand,NULL) RETURNING id INTO wid;
 INSERT INTO public.directory_brands(workspace_id,name,website_url,category,category_id,description,logo_url,slug,is_editorial,moods,affiliated,status)
 VALUES(wid,req.brand,req.website,req.category,cid,req.description,req.logo_url,slug_value,true,req.moods,false,'draft') RETURNING id INTO bid;
 INSERT INTO public.brand_moods(brand_id,mood_id) SELECT bid,id FROM public.moods WHERE name=ANY(req.moods);
 UPDATE public.brand_requests SET status='approved',admin_note=nullif(_admin_note,''),reviewed_at=now(),reviewed_by=_admin_id,created_brand_id=bid,needs_info_at=NULL WHERE id=_request_id;
 INSERT INTO public.admin_audit_log(admin_user_id,action,workspace_id,target,reason) VALUES(_admin_id,'brand_request.approve',wid,'brand_request:'||_request_id::text,_admin_note);
 RETURN bid;
END $$;
CREATE FUNCTION public.approve_brand_request(_request_id uuid,_admin_id uuid,_admin_note text DEFAULT NULL) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$ SELECT private.approve_brand_request($1,$2,$3) $$;
ALTER FUNCTION public.decline_brand_request(uuid,uuid,text) SET SCHEMA private;
CREATE OR REPLACE FUNCTION private.decline_brand_request(_request_id uuid,_admin_id uuid,_admin_note text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT private.has_role(_admin_id,'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE public.brand_requests SET status='declined',admin_note=nullif(trim(_admin_note),''),reviewed_at=now(),reviewed_by=_admin_id,needs_info_at=NULL WHERE id=_request_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
 INSERT INTO public.admin_audit_log(admin_user_id,action,target,reason) VALUES(_admin_id,'brand_request.decline','brand_request:'||_request_id::text,_admin_note);
 RETURN true;
END $$;
CREATE FUNCTION public.decline_brand_request(_request_id uuid,_admin_id uuid,_admin_note text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$ SELECT private.decline_brand_request($1,$2,$3) $$;
REVOKE ALL ON FUNCTION private.approve_brand_request(uuid,uuid,text),private.decline_brand_request(uuid,uuid,text),public.approve_brand_request(uuid,uuid,text),public.decline_brand_request(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.approve_brand_request(uuid,uuid,text),private.decline_brand_request(uuid,uuid,text),public.approve_brand_request(uuid,uuid,text),public.decline_brand_request(uuid,uuid,text) TO service_role;