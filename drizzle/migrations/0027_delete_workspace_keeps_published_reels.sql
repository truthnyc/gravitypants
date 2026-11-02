CREATE OR REPLACE FUNCTION private.delete_workspace(_ws uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE n int; b record; ed uuid; kept text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = _ws AND user_id = auth.uid() AND role = 'owner') THEN
    RAISE EXCEPTION 'Only the owner can delete this workspace';
  END IF;
  SELECT count(*) INTO n FROM workspace_members WHERE user_id = auth.uid();
  IF n < 2 THEN RAISE EXCEPTION 'You can''t delete your only workspace'; END IF;
  IF EXISTS (SELECT 1 FROM workspace_billing WHERE workspace_id = _ws AND stripe_subscription_id IS NOT NULL AND status IN ('active','trialing','past_due') AND NOT cancel_at_period_end) THEN
    RAISE EXCEPTION 'This workspace has an active paid plan. Cancel it in Manage Billing first';
  END IF;

  -- Published reels (Aimanté live, Gravity Pants Showcase, or website reels) survive:
  -- their brand moves to its own editorial workspace together with the reel's ad.
  FOR b IN
    SELECT db.* FROM directory_brands db
    WHERE db.workspace_id = _ws AND (
      EXISTS (SELECT 1 FROM directory_reels r WHERE r.brand_id = db.id AND (r.status = 'live' OR r.in_showcase))
      OR EXISTS (SELECT 1 FROM site_reels s WHERE s.brand_id = db.id))
  LOOP
    INSERT INTO workspaces(name, owner_id) VALUES ('Editorial · ' || b.name, NULL) RETURNING id INTO ed;
    UPDATE projects SET workspace_id = ed, brand_kit_id = NULL, template_id = CASE WHEN template_id IN (SELECT id FROM templates WHERE workspace_id = _ws) THEN NULL ELSE template_id END
      WHERE id IN (SELECT ad_id FROM directory_reels WHERE brand_id = b.id AND (status = 'live' OR in_showcase));
    UPDATE directory_reels SET template_id = NULL
      WHERE brand_id = b.id AND template_id IN (SELECT id FROM templates WHERE workspace_id = _ws);
    UPDATE directory_brands SET workspace_id = ed, is_editorial = true WHERE id = b.id;
    -- Unpublished reels of this brand go with the workspace.
    DELETE FROM directory_reels WHERE brand_id = b.id AND NOT (status = 'live' OR in_showcase);
  END LOOP;

  -- Text of everything kept, so files those reels use are not removed.
  SELECT coalesce(string_agg(t, ' '), '') INTO kept FROM (
    SELECT p.logo::text || coalesce(p.thumbnail_url,'') AS t FROM projects p WHERE p.id IN (SELECT ad_id FROM directory_reels r JOIN directory_brands db ON db.id = r.brand_id WHERE db.is_editorial AND r.ad_id IN (SELECT id FROM projects WHERE workspace_id <> _ws))
    UNION ALL SELECT f.photo::text FROM frames f JOIN projects p ON p.id = f.project_id WHERE p.workspace_id IN (SELECT workspace_id FROM directory_brands WHERE id IN (SELECT brand_id FROM directory_reels WHERE ad_id = p.id))
    UNION ALL SELECT concat_ws(' ', r.poster_url, r.preview_url, r.video_url, r.pending_video_url) FROM directory_reels r WHERE r.ad_id IN (SELECT id FROM projects) AND r.brand_id IN (SELECT id FROM directory_brands WHERE is_editorial)
    UNION ALL SELECT coalesce(db.logo_url,'') FROM directory_brands db WHERE db.is_editorial
  ) x;

  DELETE FROM projects WHERE workspace_id = _ws;
  DELETE FROM assets WHERE workspace_id = _ws;
  DELETE FROM brand_kit WHERE workspace_id = _ws;
  DELETE FROM storage.objects
    WHERE bucket_id IN ('media','brand-assets') AND (storage.foldername(name))[1] = _ws::text
      AND position(name IN kept) = 0;
  DELETE FROM workspaces WHERE id = _ws;
END $function$;