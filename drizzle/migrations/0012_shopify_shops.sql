CREATE TABLE public.shopify_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text NOT NULL UNIQUE CHECK (shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  access_token text NOT NULL,
  scopes text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  uninstalled_at timestamptz,
  linked_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  billing_source text NOT NULL DEFAULT 'shopify' CHECK (billing_source IN ('web','shopify')),
  aimante_opt_in boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shopify_shops TO service_role;
ALTER TABLE public.shopify_shops ENABLE ROW LEVEL SECURITY;
-- No policies: browsers (anon/authenticated) cannot read or write; only server code with the service role.

-- Billing rule: a linked account with an active paid web plan => 'web'; otherwise 'shopify'.
CREATE OR REPLACE FUNCTION public.shopify_billing_source() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.linked_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members m JOIN workspace_billing b ON b.workspace_id = m.workspace_id
    WHERE m.user_id = NEW.linked_user_id
      AND b.plan IN ('simple','simple_yearly','business','business_yearly','team','team_yearly')
      AND b.status IN ('active','trialing','past_due')
      AND b.stripe_subscription_id IS NOT NULL
  ) THEN
    NEW.billing_source := 'web';
  ELSE
    NEW.billing_source := 'shopify';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.shopify_billing_source() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER shopify_shops_billing BEFORE INSERT OR UPDATE OF linked_user_id ON public.shopify_shops
FOR EACH ROW EXECUTE FUNCTION public.shopify_billing_source();