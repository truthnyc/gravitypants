import type { createStripeClient } from "@/lib/stripe.server";
import { PLAN_PRICE_KEYS } from "./plan-map";

export const PORTAL_TAG = "gravitypants_v2"; // bump when the plan list changes so the portal offers every plan

/**
 * Billing portal rules: switch plans immediately with a fair-share (prorated) charge or credit,
 * cancel at the end of the paid period, and ask a short "why are you leaving?" survey.
 */
export async function ensurePortalConfig(stripe: ReturnType<typeof createStripeClient>): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const found = existing.data.find((c) => c.metadata?.["tag"] === PORTAL_TAG);
  if (found) return found.id;
  const prices = await stripe.prices.list({ lookup_keys: [...PLAN_PRICE_KEYS], limit: 10 });
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

