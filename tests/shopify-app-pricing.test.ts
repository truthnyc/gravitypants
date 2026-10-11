import { describe, expect, it, vi } from "vitest";
import { appPlanFor, limitsFor, planFromSubscription, pricingPlansUrl, resolveShopPlan, type StoredPlan } from "@/lib/shopify/app-pricing";

const free: StoredPlan = { handle: "free", period: null, checkedAt: null, cycleStart: null, cycleEnd: null, cancelAtEnd: false };
const sub = (handle: string, billingPeriod = "MONTHLY") => ({ billingPeriod, cancelAtEndOfCycle: false, trialEndsAt: null, currentBillingCycle: { startTime: "2026-10-01T00:00:00Z", endTime: "2026-11-01T00:00:00Z" }, items: [{ handle }] });

describe("Shopify plan handles", () => {
  it("map to the same limits as gravitypants.com", () => {
    expect(limitsFor("free")).toMatchObject({ exports: 3, total: true, watermark: "after_first", seats: 1 });
    expect(limitsFor("simple")).toMatchObject({ exports: 10, watermark: "never", seats: 1 });
    expect(limitsFor("business")).toMatchObject({ exports: 50, watermark: "never", seats: 1 });
    expect(limitsFor("team")).toMatchObject({ exports: 150, watermark: "never", seats: 5 });
  });
  it("map to the web billing plans by period", () => {
    expect(appPlanFor("free")).toBe("trial");
    expect(appPlanFor("simple", "MONTHLY")).toBe("simple");
    expect(appPlanFor("business", "ANNUAL")).toBe("business_yearly");
    expect(appPlanFor("team", "YEARLY")).toBe("team_yearly");
  });
  it("treats a null subscription as free", () => {
    expect(planFromSubscription(null).handle).toBe("free");
  });
  it("builds the hosted plan page URL from the myshopify prefix", () => {
    expect(pricingPlansUrl("gravity-pants-test.myshopify.com", "gravity-pants")).toBe("https://admin.shopify.com/store/gravity-pants-test/charges/gravity-pants/pricing_plans");
  });
});

describe("resolveShopPlan", () => {
  it("skips the Partner API for web billing", async () => {
    const fetchSubscription = vi.fn();
    const r = await resolveShopPlan({ billingSource: "web", stored: free, configured: true, fetchSubscription, save: vi.fn() });
    expect(fetchSubscription).not.toHaveBeenCalled();
    expect(r.source).toBe("web");
  });
  it("does not downgrade a cached paid plan on error", async () => {
    const paid: StoredPlan = { ...free, handle: "business", period: "MONTHLY", checkedAt: "2020-01-01T00:00:00Z" };
    const save = vi.fn();
    const r = await resolveShopPlan({ billingSource: "shopify", stored: paid, configured: true, fetchSubscription: () => Promise.reject(new Error("throttled")), save });
    expect(r.plan.handle).toBe("business");
    expect(save).not.toHaveBeenCalled();
  });
  it("uses the cache for 5 minutes unless forced", async () => {
    const paid: StoredPlan = { ...free, handle: "simple", checkedAt: new Date().toISOString() };
    const fetchSubscription = vi.fn(async () => sub("team"));
    expect((await resolveShopPlan({ billingSource: "shopify", stored: paid, configured: true, fetchSubscription, save: vi.fn() })).plan.handle).toBe("simple");
    expect((await resolveShopPlan({ billingSource: "shopify", stored: paid, configured: true, fetchSubscription, save: vi.fn(), force: true })).plan.handle).toBe("team");
  });
  it("behaves as free when billing isn't configured", async () => {
    const fetchSubscription = vi.fn();
    const r = await resolveShopPlan({ billingSource: "shopify", stored: free, configured: false, fetchSubscription, save: vi.fn() });
    expect(r.plan.handle).toBe("free");
    expect(fetchSubscription).not.toHaveBeenCalled();
  });
});
