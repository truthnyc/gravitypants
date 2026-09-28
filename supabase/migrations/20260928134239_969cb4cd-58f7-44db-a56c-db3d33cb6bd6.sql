CREATE OR REPLACE FUNCTION public.delete_workspace(_ws uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = _ws AND user_id = auth.uid() AND role = 'owner') THEN
    RAISE EXCEPTION 'Only the owner can delete this workspace';
  END IF;
  SELECT count(*) INTO n FROM workspace_members WHERE user_id = auth.uid();
  IF n < 2 THEN RAISE EXCEPTION 'You can''t delete your only workspace'; END IF;
  IF EXISTS (SELECT 1 FROM workspace_billing WHERE workspace_id = _ws AND stripe_subscription_id IS NOT NULL AND status IN ('active','trialing','past_due') AND NOT cancel_at_period_end) THEN
    RAISE EXCEPTION 'This workspace has an active paid plan. Cancel it in Manage Billing first';
  END IF;
  DELETE FROM projects WHERE workspace_id = _ws;
  DELETE FROM assets WHERE workspace_id = _ws;
  DELETE FROM brand_kit WHERE workspace_id = _ws;
  DELETE FROM storage.objects WHERE bucket_id IN ('media','brand-assets') AND (storage.foldername(name))[1] = _ws::text;
  DELETE FROM workspaces WHERE id = _ws;
END $$;
REVOKE ALL ON FUNCTION public.delete_workspace(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_workspace(uuid) TO authenticated;

DROP POLICY IF EXISTS "brand-assets insert" ON storage.objects;
CREATE POLICY "brand-assets insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-assets'
  AND lower(storage.extension(name)) = ANY (ARRAY['png','jpg','jpeg','webp','svg','gif'])
  AND (is_workspace_member((storage.foldername(name))[1]) OR has_support_session((storage.foldername(name))[1])));