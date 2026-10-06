DO $$ DECLARE src text; BEGIN
  SELECT pg_get_functiondef('public.directory_faceted_search(text,text[],text[],text[],int,int)'::regprocedure) INTO src;
  src := replace(src, 'least(greatest(coalesce(page_size, 12), 1), 60)', 'least(greatest(coalesce(page_size, 12), 1), 240)');
  EXECUTE src;
END $$;