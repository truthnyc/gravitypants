import { describe, expect, it } from "vitest";
import { BILLING_PLAN_VALUES, PLAN_BY_PRICE, PLAN_NAMES, PLAN_PRICE_KEYS, mapStatus } from "@/lib/stillframe/plan-map";
import { checkoutProductCopy, planById } from "@/lib/stillframe/plans-config";

const PRICES = ["simple_monthly", "simple_yearly", "business_monthly", "business_yearly", "team_monthly", "team_yearly"];

describe("plan mapping", () => {
  it.each(PRICES)("choosing %s maps to a named plan", (price) => {
    const plan = PLAN_BY_PRICE[price];
    expect(plan).toBeTruthy();
    expect(PLAN_NAMES[plan!]).toBeTruthy();
    expect(BILLING_PLAN_VALUES).toContain(plan);
  });

  it("Manage Billing offers every plan", () => {
    expect([...PLAN_PRICE_KEYS].sort()).toEqual([...PRICES].sort());
  });

  it("keeps access while payment is retried and after a plan change", () => {
    expect(mapStatus("active")).toBe("active");
    expect(mapStatus("trialing")).toBe("active");
    expect(mapStatus("past_due")).toBe("past_due");
    expect(mapStatus("canceled")).toBe("canceled");
  });

  it("derives checkout descriptions from the pricing plans", () => {
    expect(checkoutProductCopy(planById("simple"))).toEqual({
      name: "Gravity Pants Simple",
      description: expect.stringContaining("10 exports a month"),
    });
    expect(checkoutProductCopy(planById("business"))).toEqual({
      name: "Gravity Pants Business",
      description: expect.stringContaining("50 exports a month"),
    });
    const team = checkoutProductCopy(planById("team"));
    expect(team.name).toBe("Gravity Pants Team");
    expect(team.description).toContain("You + 4 teammates");
    expect(team.description).toContain("150 exports a month, shared");
    expect(planById("simple").seats).toBe(1);
    expect(planById("business").seats).toBe(1);
    expect(planById("team").seats).toBe(5);
  });
});
