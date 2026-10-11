// Reads the shop's Shopify App Pricing subscription from the Partner API and mirrors it into the shop
// workspace's workspace_billing row, so SQL export_status/record_export apply the web plan rules unchanged.
// We never create charges here.
import { adminGraphql } from "./shopify.server";
import { appPlanFor, isPlanHandle, pricingPlansUrl, resolveShopPlan, type ActiveSubscription, type StoredPlan } from "./app-pricing";

type Ctx = { shop: string; ws: string; admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin; accessToken: () => Promise<string> };

const PARTNER_VERSION = "2026-07";
const QUERY = `query ActiveSubscription($appId: ID!, $shopId: ID!) { activeSubscription(appId: $appId, shopId: $shopId) { billingPeriod cancelAtEndOfCycle trialEndsAt currentBillingCycle { startTime endTime } items { handle } } }`;

export function partnerConfig() {
  const org = process.env["SHOPIFY_PARTNER_ORG_ID"];
  const token = process.env["SHOPIFY_PARTNER_API_ACCESS_TOKEN"];
  const appId = process.env["SHOPIFY_APP_GID"];
  const appHandle = process.env["SHOPIFY_APP_HANDLE"];
  return { org, token, appId, appHandle, configured: Boolean(org && token && appId && appHandle) };
}

// Partner API allows 4 requests/second; space calls within this isolate.
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 260;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

async function partnerQuery(appId: string, shopId: string): Promise<ActiveSubscription> {
  const { org, token } = partnerConfig();
  for (let attempt = 0; attempt < 2; attempt++) {
    await throttle();
    const res = await fetch(`https://partners.shopify.com/${org}/api/${PARTNER_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token! },
      body: JSON.stringify({ query: QUERY, variables: { appId, shopId } }),
    });
    const json = (await res.json().catch(() => null)) as { data?: { activeSubscription: ActiveSubscription }; errors?: { message?: string; extensions?: { code?: string } }[] } | null;
    const throttled = res.status === 429 || json?.errors?.some((e) => e.extensions?.code === "THROTTLED");
    if (throttled && attempt === 0) { await new Promise((r) => setTimeout(r, 1000)); continue; }
    if (!res.ok || !json || json.errors?.length || !json.data) throw new Error(`Partner API failed (${res.status}) ${JSON.stringify(json?.errors ?? "").slice(0, 200)}`);
    return json.data.activeSubscription ?? null;
  }
  throw new Error("Partner API throttled");
}

async function shopGid(ctx: Ctx, stored: string | null) {
  if (stored) return stored;
  const d = await adminGraphql<{ shop: { id: string } }>(ctx.shop, await ctx.accessToken(), `query ShopId { shop { id } }`);
  await ctx.admin.from("shopify_shops").update({ shop_gid: d.shop.id }).eq("shop_domain", ctx.shop);
  return d.shop.id;
}

/** Current plan for the shop. force=true bypasses the 5-minute cache (welcome page). */
export async function checkShopPlan(ctx: Ctx, force = false) {
  const cfg = partnerConfig();
  const { data: row } = await ctx.admin
    .from("shopify_shops")
    .select("billing_source, shop_gid, plan_handle, billing_period, last_checked_at, plan_cycle_start, plan_cycle_end, plan_cancel_at_end")
    .eq("shop_domain", ctx.shop)
    .single();
  const stored: StoredPlan = {
    handle: isPlanHandle(row?.plan_handle) ? row.plan_handle : "free",
    period: row?.billing_period ?? null,
    checkedAt: row?.last_checked_at ?? null,
    cycleStart: row?.plan_cycle_start ?? null,
    cycleEnd: row?.plan_cycle_end ?? null,
    cancelAtEnd: Boolean(row?.plan_cancel_at_end),
  };
  const result = await resolveShopPlan({
    billingSource: row?.billing_source === "web" ? "web" : "shopify",
    stored,
    configured: cfg.configured,
    force,
    fetchSubscription: async () => partnerQuery(cfg.appId!, await shopGid(ctx, row?.shop_gid ?? null)),
    save: async (p) => {
      await ctx.admin.from("shopify_shops").update({
        plan_handle: p.handle, billing_period: p.period, last_checked_at: p.checkedAt,
        plan_cycle_start: p.cycleStart, plan_cycle_end: p.cycleEnd, plan_cancel_at_end: p.cancelAtEnd,
      }).eq("shop_domain", ctx.shop);
      const paid = p.handle !== "free";
      await ctx.admin.from("workspace_billing").upsert({
        workspace_id: ctx.ws,
        environment: "shopify",
        plan: appPlanFor(p.handle, p.period),
        status: paid ? "active" : "trialing",
        current_period_start: paid ? p.cycleStart : null,
        current_period_end: paid ? p.cycleEnd : null,
        cancel_at_period_end: p.cancelAtEnd,
      }, { onConflict: "workspace_id" });
    },
  });
  if (result.error) console.error("shopify plan check", ctx.shop, result.error);
  return { ...result, configured: cfg.configured, upgradeUrl: cfg.configured ? pricingPlansUrl(ctx.shop, cfg.appHandle!) : null };
}
