import { describe, expect, it } from "vitest";
import { clickRate, statsAllowed } from "@/lib/directory/brand-stats";

describe("brand stats access", () => {
  it("is open to Business and Team plans", () => {
    expect(statsAllowed("business")).toBe(true);
    expect(statsAllowed("team")).toBe(true);
  });
  it("is closed to Simple and the free trial", () => {
    expect(statsAllowed("simple")).toBe(false);
    expect(statsAllowed(null)).toBe(false);
  });
});

describe("click rate", () => {
  it("is clicks divided by views", () => expect(clickRate(5, 20)).toBe(0.25));
  it("is zero with no views", () => expect(clickRate(3, 0)).toBe(0));
});

import { estimateRevenue as est } from "@/lib/directory/brand-stats";
import { test as t2, expect as e2 } from "vitest";
t2("revenue estimate = clicks × buy rate × average order", () => {
  e2(est(100)).toBe(187.5);
  e2(est(40, 50, 0.05)).toBe(100);
  e2(est(0)).toBe(0);
});
