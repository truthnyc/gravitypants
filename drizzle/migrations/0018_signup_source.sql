ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_ref text,
  ADD COLUMN IF NOT EXISTS signup_utm_source text,
  ADD COLUMN IF NOT EXISTS signup_utm_medium text,
  ADD COLUMN IF NOT EXISTS signup_utm_campaign text,
  ADD COLUMN IF NOT EXISTS signup_landing_path text,
  ADD COLUMN IF NOT EXISTS signup_referrer_host text,
  ADD COLUMN IF NOT EXISTS signup_source_saved_at timestamptz;

CREATE OR REPLACE FUNCTION private.guard_signup_source() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_setting('app.signup_source_write', true) = 'on' AND OLD.signup_source_saved_at IS NULL THEN RETURN NEW; END IF;
  NEW.signup_ref := OLD.signup_ref; NEW.signup_utm_source := OLD.signup_utm_source;
  NEW.signup_utm_medium := OLD.signup_utm_medium; NEW.signup_utm_campaign := OLD.signup_utm_campaign;
  NEW.signup_landing_path := OLD.signup_landing_path; NEW.signup_referrer_host := OLD.signup_referrer_host;
  NEW.signup_source_saved_at := OLD.signup_source_saved_at;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard_signup_source BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_signup_source();

CREATE OR REPLACE FUNCTION private.record_signup_source(_ref text, _utm_source text, _utm_medium text, _utm_campaign text, _landing_path text, _referrer_host text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); n int;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  INSERT INTO public.profiles (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  PERFORM set_config('app.signup_source_write', 'on', true);
  UPDATE public.profiles SET
    signup_ref = nullif(left(btrim(_ref), 100), ''),
    signup_utm_source = nullif(left(btrim(_utm_source), 100), ''),
    signup_utm_medium = nullif(left(btrim(_utm_medium), 100), ''),
    signup_utm_campaign = nullif(left(btrim(_utm_campaign), 100), ''),
    signup_landing_path = nullif(left(split_part(split_part(btrim(_landing_path), '?', 1), '#', 1), 100), ''),
    signup_referrer_host = nullif(left(lower(btrim(_referrer_host)), 100), ''),
    signup_source_saved_at = now()
  WHERE user_id = uid AND signup_source_saved_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.signup_source_write', 'off', true);
  RETURN n > 0;
END $$;
REVOKE ALL ON FUNCTION private.record_signup_source(text,text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.record_signup_source(text,text,text,text,text,text) TO authenticated;

CREATE FUNCTION public.record_signup_source(_ref text, _utm_source text, _utm_medium text, _utm_campaign text, _landing_path text, _referrer_host text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$ SELECT private.record_signup_source($1,$2,$3,$4,$5,$6) $$;
REVOKE ALL ON FUNCTION public.record_signup_source(text,text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_signup_source(text,text,text,text,text,text) TO authenticated;