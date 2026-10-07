CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $migration$
DECLARE
  f record;
  identity_args text;
  declaration_args text;
  result_type text;
  call_args text;
  original_definition text;
  private_definition text;
  wrapper_body text;
  access_guard text;
  volatility text;
BEGIN
  FOR f IN
    SELECT p.*, n.nspname,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS allow_anon,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS allow_authenticated
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    ORDER BY p.proname
  LOOP
    identity_args := pg_get_function_identity_arguments(f.oid);
    declaration_args := pg_get_function_arguments(f.oid);
    result_type := pg_get_function_result(f.oid);
    SELECT coalesce(string_agg('$' || i::text, ', ' ORDER BY i), '')
      INTO call_args FROM generate_series(1, f.pronargs) AS i;
    original_definition := pg_get_functiondef(f.oid);
    private_definition := replace(original_definition,
      'CREATE OR REPLACE FUNCTION public.' || quote_ident(f.proname) || '(',
      'CREATE OR REPLACE FUNCTION private.' || quote_ident(f.proname) || '(');
    IF private_definition = original_definition THEN
      RAISE EXCEPTION 'Could not relocate implementation for %', f.proname;
    END IF;
    EXECUTE private_definition;
    EXECUTE format('ALTER FUNCTION private.%I(%s) SET search_path = pg_catalog, public, extensions, pg_temp', f.proname, identity_args);
    EXECUTE format('REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC, anon, authenticated', f.proname, identity_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO service_role', f.proname, identity_args);
    IF f.allow_anon THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO anon', f.proname, identity_args);
    END IF;
    IF f.allow_authenticated THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO authenticated', f.proname, identity_args);
    END IF;

    access_guard := '';
    IF f.proname IN ('billing_source', 'directory_effective_plan', 'workspace_seats') THEN
      access_guard := $guard$
        IF current_user IN ('anon', 'authenticated') AND NOT (
          public.is_workspace_member($1::text) OR public.has_support_session($1::text) OR public.is_platform_admin()
        ) THEN RETURN NULL; END IF;
      $guard$;
    ELSIF f.proname = 'billing_covered' THEN
      access_guard := $guard$
        IF current_user IN ('anon', 'authenticated') AND NOT (
          public.is_workspace_member($1::text) OR public.has_support_session($1::text) OR public.is_platform_admin()
        ) THEN RETURN; END IF;
      $guard$;
    ELSIF f.proname = 'has_role' THEN
      access_guard := $guard$
        IF current_user IN ('anon', 'authenticated') AND $1 IS DISTINCT FROM auth.uid() THEN RETURN false; END IF;
      $guard$;
    ELSIF f.proname = 'record_export' THEN
      access_guard := $guard$
        IF current_user IN ('anon', 'authenticated') THEN
          IF NOT (public.is_workspace_member($1::text) OR public.has_support_session($1::text)) THEN RETURN false; END IF;
          IF $2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id = $2 AND workspace_id = $1) THEN RETURN false; END IF;
        END IF;
      $guard$;
    END IF;
    IF f.proretset THEN
      wrapper_body := 'BEGIN ' || access_guard || format(' RETURN QUERY SELECT * FROM private.%I(%s); END', f.proname, call_args);
    ELSIF f.prorettype = 'void'::regtype THEN
      wrapper_body := 'BEGIN ' || access_guard || format(' PERFORM private.%I(%s); RETURN; END', f.proname, call_args);
    ELSE
      wrapper_body := 'BEGIN ' || access_guard || format(' RETURN private.%I(%s); END', f.proname, call_args);
    END IF;
    volatility := CASE f.provolatile WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' ELSE 'VOLATILE' END;
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS %s LANGUAGE plpgsql %s SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS %L',
      f.proname, declaration_args, result_type, volatility, wrapper_body);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', f.proname, identity_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', f.proname, identity_args);
    IF f.allow_anon THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', f.proname, identity_args);
    END IF;
    IF f.allow_authenticated THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', f.proname, identity_args);
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) THEN RAISE EXCEPTION 'Privileged public API functions remain exposed'; END IF;
END;
$migration$;

-- Regression checks run as real API roles with no signed-in identity.
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
DO $test$
BEGIN
  IF public.brand_visible('ffffffff-ffff-4fff-8fff-ffffffffffff') IS TRUE THEN
    RAISE EXCEPTION 'Unknown brands must not be public';
  END IF;
  IF NOT has_function_privilege(current_user, 'public.search_directory(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Public directory search lost its access';
  END IF;
  IF has_function_privilege(current_user, 'public.ensure_workspace()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous callers can create workspaces';
  END IF;
END;
$test$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  IF public.is_workspace_member('ffffffff-ffff-4fff-8fff-ffffffffffff') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Workspace access must require membership';
  END IF;
  IF public.billing_source('ffffffff-ffff-4fff-8fff-ffffffffffff') IS NOT NULL THEN
    RAISE EXCEPTION 'Private billing source leaked';
  END IF;
  IF public.record_export('ffffffff-ffff-4fff-8fff-ffffffffffff', NULL, 'security-regression-denied') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Export recording must require workspace access';
  END IF;
  IF has_function_privilege(current_user, 'public.approve_brand_request(uuid,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Brand approvals must remain server-only';
  END IF;
END;
$test$;
RESET ROLE;
NOTIFY pgrst, 'reload schema';