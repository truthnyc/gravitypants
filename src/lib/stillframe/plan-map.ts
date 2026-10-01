import { PLANS } from "./plans-config";

/** Single source for how payment prices map to app plans. Used by the webhook, the portal and the billing checks. */
export const PLAN_BY_PRICE: Record<string, string> = {
  simple_monthly: "simple",
  simple_yearly: "simple_yearly",
  business_monthly: "business",
  business_yearly: "business_yearly",
  team_monthly: "team",
  team_yearly: "team_yearly",
};

export const PLAN_PRICE_KEYS = Object.keys(PLAN_BY_PRICE);

/** Every value workspace_billing.plan may hold (must match the database check). */
export const BILLING_PLAN_VALUES = ["trial", "none", ...Object.values(PLAN_BY_PRICE)];

export const PLAN_NAMES: Record<string, string> = Object.fromEntries(
  PLANS.flatMap((p) => [[p.id, p.name], ...(p.yearly != null ? [[`${p.id}_yearly`, `${p.name} Yearly`]] : [])]),
);

export function mapStatus(s: string): string {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "past_due";
  return "canceled";
}
