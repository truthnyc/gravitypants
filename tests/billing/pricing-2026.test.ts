import { describe, expect, it } from "vitest";
import { COMPARE, EXPORT_PACKS, PLANS, SALE_PLANS, TRIAL, perReel, planById, priceFor } from "@/lib/stillframe/plans-config";
import { PLAN_BY_PRICE } from "@/lib/stillframe/plan-map";
import { canUseWith, planTier, type Entitlements } from "@/lib/stillframe/plan";
import { canBuyPacks } from "@/lib/stillframe/billing.functions";

const active = (plan: string) => ({ plan, status: "active", current_period_end: null });
const ent = (tier: string | null, extra: Partial<Entitlements> = {}): Entitlements => ({ paid: tier != null, team: tier === "team", exports: null, tier, ...extra });

describe("plans", () => {
  it("Free: 6 exports, first clean", () => {
    expect(TRIAL.name).toBe("Free");
    expect(TRIAL.exports).toBe(6);
    expect(TRIAL.cleanExports).toBe(1);
  });
  it("prices and limits", () => {
    expect([planById("starter").monthly, planById("starter").yearly, planById("starter").monthlyExports]).toEqual([19, 190, 5]);
    expect([planById("simple").monthly, planById("simple").yearly, planById("simple").monthlyExports]).toEqual([35, 350, 10]);
    expect([planById("business").monthly, planById("business").yearly, planById("business").monthlyExports]).toEqual([79, 790, 30]);
    expect([planById("team").monthly, planById("team").yearly, planById("team").monthlyExports, planById("team").seats]).toEqual([175, 1750, 150, 5]);
  });
  it("yearly per-month equivalents", () => {
    expect(PLANS.map((p) => priceFor(p, "yearly").price)).toEqual(["$16", "$29", "$66", "$146"]);
    expect(priceFor(planById("simple"), "yearly").note).toBe("billed $350 yearly");
  });
  it("cost per reel at monthly price", () => {
    expect(PLANS.map(perReel)).toEqual(["$3.80", "$3.50", "$2.63", "$1.17"]);
  });
  it("packs: 5/$25, 10/$45, 20/$80", () => {
    expect(EXPORT_PACKS.map((p) => [p.exports, p.price])).toEqual([[5, 25], [10, 45], [20, 80]]);
  });
  it("HTML5 row: only Business and Team", () => {
    const row = COMPARE.flatMap((g) => g.rows).find((r) => r.label === "HTML5")!;
    expect(row.cells).toEqual([false, false, true, true]);
  });
  it("Starter prices map to the starter plan", () => {
    expect(PLAN_BY_PRICE.starter_monthly).toBe("starter");
    expect(PLAN_BY_PRICE.starter_yearly).toBe("starter_yearly");
  });
});

describe("gates", () => {
  it("packs only for paid plans", () => {
    expect(canBuyPacks({ plan: "trial", status: "trialing" })).toBe(false);
    expect(canBuyPacks(active("starter"))).toBe(true);
    expect(canBuyPacks(active("business_yearly"))).toBe(true);
    expect(canBuyPacks({ plan: "trial", status: "trialing" }, true)).toBe(true);
  });
  it("starter is a paid tier", () => {
    expect(planTier(active("starter_yearly"))).toBe("starter");
  });
  it("HTML5 only on Business and Team", () => {
    expect(canUseWith(ent(null, { trial: true }), "html5")).toBe(false);
    expect(canUseWith(ent("starter"), "html5")).toBe(false);
    expect(canUseWith(ent("simple"), "html5")).toBe(false);
    expect(canUseWith(ent("business"), "html5")).toBe(true);
    expect(canUseWith(ent("team"), "html5")).toBe(true);
  });
  it("Simple is no longer sold but still exists for existing subscribers", () => {
    expect(SALE_PLANS.map((p) => p.id)).toEqual(["starter", "business", "team"]);
    expect(planById("simple").monthlyExports).toBe(10);
  });
});
