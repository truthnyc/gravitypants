ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS audience text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_until timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft jsonb;

ALTER TABLE public.templates ADD CONSTRAINT templates_status_check CHECK (status IN ('draft','published','archived'));

DROP POLICY IF EXISTS "Read own or team templates" ON public.templates;
CREATE POLICY "Read own or team templates" ON public.templates FOR SELECT USING (
  (source = 'system' AND status = 'published')
  OR (source <> 'system' AND visibility = 'global')
  OR (is_workspace_member((workspace_id)::text) AND ((created_by = auth.uid()) OR (visibility = 'team')))
  OR has_support_session((workspace_id)::text)
  OR is_platform_admin()
);

CREATE POLICY "Signed-in users read system template art" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'system');