// Shopify App Pricing rules (pure, shared by server and browser). Shopify hosts the plan page and
// creates the subscription; we only read it. Each handle maps to the same app plan as gravitypants.com.
import { PLANS, TRIAL, type PlanId } from "@/lib/stillframe/plans-config";

export const SHOPIFY_PLAN_HANDLES = ["free", "simple", "business", "team"] as const;
export type ShopifyPlanHandle = (typeof SHOPIFY_PLAN_HANDLES)[number];
export const CACHE_MS = 5 * 60 * 1000;

export const isPlanHandle = (h: unknown): h is ShopifyPlanHandle => typeof h === "string" && (SHOPIFY_PLAN_HANDLES as readonly string[]).includes(h);
export const isYearly = (period: string | null | undefined) => /ANNUAL|YEAR/i.test(period ?? "");

/** workspace_billing.plan for a handle + billing period ('trial' = the web free trial). */
export function appPlanFor(handle: ShopifyPlanHandle, period?: string | null): string {
  if (handle === "free") return "trial";
  return isYearly(period) ? `${handle}_yearly` : handle;
}

export type PlanLimits = { name: string; seats: number; exports: number; total: boolean; watermark: "after_first" | "never" };
export function limitsFor(handle: ShopifyPlanHandle): PlanLimits {
  if (handle === "free") return { name: "Free", seats: 1, exports: TRIAL.exports, total: true, watermark: "after_first" };
  const p = PLANS.find((x) => x.id === (handle as PlanId))!;
  return { name: p.name, seats: p.seats, exports: p.monthlyExports, total: false, watermark: "never" };
}

/** Shopify's hosted plan page. storeHandle is the myshopify prefix. */
export function pricingPlansUrl(shopDomain: string, appHandle: string) {
  const store = shopDomain.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${encodeURIComponent(store)}/charges/${encodeURIComponent(appHandle)}/pricing_plans`;
}

export type ActiveSubscription = {
  billingPeriod: string | null;
  cancelAtEndOfCycle: boolean | null;
  trialEndsAt: string | null;
  currentBillingCycle: { startTime: string; endTime: string } | null;
  items: { handle: string }[];
} | null;

export type StoredPlan = { handle: ShopifyPlanHandle; period: string | null; checkedAt: string | null; cycleStart: string | null; cycleEnd: string | null; cancelAtEnd: boolean };

/** A Partner API answer → plan to store. null subscription (or unknown handle) means free. */
export function planFromSubscription(sub: ActiveSubscription, now = new Date()): StoredPlan {
  const h = sub?.items?.[0]?.handle;
  if (!sub || !isPlanHandle(h) || h === "free") return { handle: "free", period: null, checkedAt: now.toISOString(), cycleStart: null, cycleEnd: null, cancelAtEnd: false };
  return {
    handle: h,
    period: sub.billingPeriod ?? null,
    checkedAt: now.toISOString(),
    cycleStart: sub.currentBillingCycle?.startTime ?? null,
    cycleEnd: sub.currentBillingCycle?.endTime ?? null,
    cancelAtEnd: Boolean(sub.cancelAtEndOfCycle),
  };
}

/** Only a confirmed paid plan is cached. */
export const cacheFresh = (p: StoredPlan, now = Date.now()) => p.handle !== "free" && !!p.checkedAt && now - Date.parse(p.checkedAt) < CACHE_MS;

export type Deps = {
  billingSource: "web" | "shopify";
  stored: StoredPlan;
  configured: boolean;
  fetchSubscription: () => Promise<ActiveSubscription>;
  save: (p: StoredPlan) => Promise<void>;
  force?: boolean;
};
export type Resolved = { source: "web" | "shopify"; plan: StoredPlan; checked: boolean; error?: string };

/** Web billing skips Shopify; errors keep the last confirmed plan (never downgrade on a failed check). */
export async function resolveShopPlan(d: Deps): Promise<Resolved> {
  if (d.billingSource === "web") return { source: "web", plan: d.stored, checked: false };
  if (!d.configured) return { source: "shopify", plan: { ...d.stored, handle: "free", period: null }, checked: false };
  if (!d.force && cacheFresh(d.stored)) return { source: "shopify", plan: d.stored, checked: false };
  try {
    const plan = planFromSubscription(await d.fetchSubscription());
    await d.save(plan);
    return { source: "shopify", plan, checked: true };
  } catch (e) {
    return { source: "shopify", plan: d.stored, checked: false, error: (e as Error).message };
  }
}
