CREATE TABLE public.klaviyo_connections (
  workspace_id uuid PRIMARY KEY,
  api_key_enc text NOT NULL,
  account_name text,
  connected_by uuid,
  connected_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.klaviyo_connections TO service_role;
ALTER TABLE public.klaviyo_connections ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.klaviyo_connections IS 'Per-workspace encrypted Klaviyo private key; service role only (no client policies).';