-- Remove the obsolete three-mood approval restriction without changing staff checks, locking, audit, or public grants.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('private.approve_brand_request(uuid,uuid,text)'::regprocedure) INTO definition;
  IF position('cardinality(req.moods) NOT BETWEEN 1 AND 3' in definition)=0 THEN RAISE EXCEPTION 'Expected approval mood validation not found'; END IF;
  definition := replace(definition, 'cardinality(req.moods) NOT BETWEEN 1 AND 3', 'cardinality(req.moods) < 1');
  EXECUTE definition;
END $$;
-- Keep the trigger signature and privileges intact; master mood foreign keys enforce valid membership.
CREATE OR REPLACE FUNCTION public.brand_moods_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN NEW;
END $$;
COMMENT ON FUNCTION public.brand_moods_limit() IS 'Legacy trigger retained for compatibility; brand mood links have no count cap.';
-- Preserve filtering, visibility and ordering; extend website formats and searchable size aliases.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.directory_faceted_search(text,text[],text[],text[],integer,integer)'::regprocedure) INTO definition;
  IF position('case s.format when ''916'' then ''9x16'' when ''11'' then ''1x1'' else ''16x9'' end' in definition)=0 THEN RAISE EXCEPTION 'Expected website format mapping not found'; END IF;
  definition := replace(definition, 'case s.format when ''916'' then ''9x16'' when ''11'' then ''1x1'' else ''16x9'' end', 'case s.format when ''916'' then ''9x16'' when ''45'' then ''4x5'' when ''11'' then ''1x1'' when ''54'' then ''5x4'' else ''16x9'' end');
  definition := replace(definition, 'case when ''1x1'' = any(p.formats)', 'case when ''4x5'' = any(p.formats) then ''4:5 4x5 portrait'' end, case when ''5x4'' = any(p.formats) then ''5:4 5x4 landscape'' end, case when ''1x1'' = any(p.formats)');
  EXECUTE definition;
END $$;