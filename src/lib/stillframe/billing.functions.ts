import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const idRe = /^[a-zA-Z0-9_-]+$/;
type Env = { environment: StripeEnv };

function checkEnv(e: unknown): StripeEnv {
  if (e !== "sandbox" && e !== "live") throw new Error("Invalid environment");
  return e;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { priceId: string; workspaceId: string; returnUrl: string } & Env) => {
    if (!idRe.test(d.priceId) || !idRe.test(d.workspaceId)) throw new Error("Invalid input");
    return { ...d, environment: checkEnv(d.environment) };
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: member } = await supabase.rpc("is_workspace_member", { _ws: data.workspaceId });
    if (!member) return { error: "You don't have access to this workspace." };
    const { data: plan } = await supabase.from("plans").select("price_id").eq("price_id", data.priceId).maybeSingle();
    if (!plan) return { error: "That plan isn't available." };
    const { data: billing } = await supabase
      .from("workspace_billing")
      .select("stripe_customer_id")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    const { data: u } = await supabase.auth.getUser();
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) return { error: "That plan isn't available." };

      let customerId = billing?.stripe_customer_id ?? null;
      if (!customerId) {
        const found = await stripe.customers.search({ query: `metadata['workspaceId']:'${data.workspaceId}'`, limit: 1 });
        customerId = found.data[0]?.id ?? null;
      }
      if (!customerId) {
        const c = await stripe.customers.create({
          ...(u.user?.email ? { email: u.user.email } : {}),
          metadata: { userId, workspaceId: data.workspaceId },
        });
        customerId = c.id;
      }
      const meta = { userId, workspaceId: data.workspaceId };
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { ...meta, managed_payments: "true" },
        subscription_data: { metadata: meta },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

/** One-time purchase: 5 extra exports that never expire. */
export const createTopUpSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; returnUrl: string } & Env) => {
    if (!idRe.test(d.workspaceId)) throw new Error("Invalid input");
    return { ...d, environment: checkEnv(d.environment) };
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: member } = await supabase.rpc("is_workspace_member", { _ws: data.workspaceId });
    if (!member) return { error: "You don't have access to this workspace." };
    const { data: billing } = await supabase
      .from("workspace_billing")
      .select("stripe_customer_id")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    const { data: u } = await supabase.auth.getUser();
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: ["extra_exports_5"] });
      const price = prices.data[0];
      if (!price) return { error: "That pack isn't available." };
      let customerId = billing?.stripe_customer_id ?? null;
      if (!customerId) {
        const found = await stripe.customers.search({ query: `metadata['workspaceId']:'${data.workspaceId}'`, limit: 1 });
        customerId = found.data[0]?.id ?? null;
      }
      if (!customerId) {
        const c = await stripe.customers.create({
          ...(u.user?.email ? { email: u.user.email } : {}),
          metadata: { userId, workspaceId: data.workspaceId },
        });
        customerId = c.id;
      }
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, workspaceId: data.workspaceId, topup: "extra_exports_5", managed_payments: "true" },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

const PORTAL_TAG = "stillframe_v1";

/**
 * Billing portal rules: switch plans immediately with a fair-share (prorated) charge or credit,
 * cancel at the end of the paid period, and ask a short "why are you leaving?" survey.
 */
async function ensurePortalConfig(stripe: ReturnType<typeof createStripeClient>): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const found = existing.data.find((c) => c.metadata?.["tag"] === PORTAL_TAG);
  if (found) return found.id;
  const prices = await stripe.prices.list({ lookup_keys: ["simple_monthly", "business_monthly", "business_yearly", "team_monthly", "team_yearly"], limit: 10 });
  const byProduct = new Map<string, string[]>();
  for (const p of prices.data) {
    const prod = typeof p.product === "string" ? p.product : p.product.id;
    byProduct.set(prod, [...(byProduct.get(prod) ?? []), p.id]);
  }
  const cfg = await stripe.billingPortal.configurations.create({
    metadata: { tag: PORTAL_TAG },
    business_profile: { headline: "Manage your Gravity Pants plan" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "always_invoice",
        products: [...byProduct].map(([product, ids]) => ({ product, prices: ids })),
      },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "switched_service", "unused", "too_complex", "other"],
        },
      },
    },
  });
  return cfg.id;
}

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; returnUrl: string } & Env) => {
    if (!idRe.test(d.workspaceId)) throw new Error("Invalid input");
    return { ...d, environment: checkEnv(d.environment) };
  })
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { data: billing } = await context.supabase
      .from("workspace_billing")
      .select("stripe_customer_id")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!billing?.stripe_customer_id) return { error: "There's no billing to manage yet. Pick a plan first." };
    try {
      const stripe = createStripeClient(data.environment);
      const configuration = await ensurePortalConfig(stripe);
      const portal = await stripe.billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: data.returnUrl, configuration });
      return { url: portal.url };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
