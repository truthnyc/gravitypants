ALTER TABLE public.workspace_billing ADD COLUMN IF NOT EXISTS storage_addon_units integer NOT NULL DEFAULT 0;

-- Caller-scoped: lists a workspace's own media files with an "in use" flag. RLS on storage.objects and app tables applies.
CREATE OR REPLACE FUNCTION public.workspace_storage_files(_ws uuid)
RETURNS TABLE(name text, bytes bigint, created_at timestamptz, kind text, in_use boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, storage AS $$
  SELECT o.name,
         coalesce((o.metadata->>'size')::bigint, 0),
         o.created_at,
         coalesce((storage.foldername(o.name))[2], 'other'),
         (storage.foldername(o.name))[2] IN ('directory','templates','shopify')
           OR EXISTS (SELECT 1 FROM public.frames f JOIN public.projects p ON p.id = f.project_id
                      WHERE p.workspace_id = _ws AND p.deleted_at IS NULL AND position(o.name in f.photo::text) > 0)
           OR EXISTS (SELECT 1 FROM public.projects p WHERE p.workspace_id = _ws AND p.deleted_at IS NULL
                      AND (position(o.name in p.logo::text) > 0 OR position(o.name in coalesce(p.thumbnail_url,'')) > 0))
           OR EXISTS (SELECT 1 FROM public.brand_kit k WHERE k.workspace_id = _ws AND position(o.name in k.logos::text || k.custom_fonts::text) > 0)
           OR EXISTS (SELECT 1 FROM public.directory_reels r JOIN public.directory_brands b ON b.id = r.brand_id
                      WHERE b.workspace_id = _ws AND position(o.name in coalesce(r.video_url,'') || coalesce(r.poster_url,'') || coalesce(r.pending_video_url,'') || coalesce(r.preview_url,'')) > 0)
  FROM storage.objects o
  WHERE public.is_workspace_member(_ws::text)
    AND o.bucket_id = 'media'
    AND (storage.foldername(o.name))[1] = _ws::text
$$;
REVOKE EXECUTE ON FUNCTION public.workspace_storage_files(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.workspace_storage_files(uuid) TO authenticated;