import { describe, expect, it } from "vitest";
import { BILLING_PLAN_VALUES, PLAN_BY_PRICE, PLAN_NAMES, PLAN_PRICE_KEYS, mapStatus } from "@/lib/stillframe/plan-map";

const PRICES = ["simple_monthly", "business_monthly", "business_yearly", "team_monthly", "team_yearly"];

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
});
