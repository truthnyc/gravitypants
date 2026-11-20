CREATE OR REPLACE FUNCTION public.workspace_storage_files(_ws uuid)
RETURNS TABLE(name text, bytes bigint, created_at timestamptz, kind text, in_use boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, storage AS $$
  WITH refs AS MATERIALIZED (
    SELECT concat_ws(' ',
      (SELECT string_agg(f.photo::text, ' ') FROM public.frames f JOIN public.projects p ON p.id = f.project_id
        WHERE p.workspace_id = _ws AND p.deleted_at IS NULL),
      (SELECT string_agg(p.logo::text || ' ' || coalesce(p.thumbnail_url, ''), ' ') FROM public.projects p
        WHERE p.workspace_id = _ws AND p.deleted_at IS NULL),
      (SELECT string_agg(k.logos::text || ' ' || k.custom_fonts::text, ' ') FROM public.brand_kit k WHERE k.workspace_id = _ws),
      (SELECT string_agg(concat_ws(' ', r.video_url, r.poster_url, r.pending_video_url, r.preview_url), ' ')
        FROM public.directory_reels r JOIN public.directory_brands b ON b.id = r.brand_id WHERE b.workspace_id = _ws)
    ) AS blob
  ), files AS MATERIALIZED (
    SELECT o.name, o.metadata, o.created_at FROM storage.objects o
    WHERE public.is_workspace_member(_ws::text) AND o.bucket_id = 'media' AND o.name LIKE _ws::text || '/%'
  )
  SELECT f.name,
         coalesce((f.metadata->>'size')::bigint, 0),
         f.created_at,
         coalesce(split_part(f.name, '/', 2), 'other'),
         split_part(f.name, '/', 2) IN ('directory','templates','shopify') OR position(f.name in r.blob) > 0
  FROM files f CROSS JOIN refs r
$$;