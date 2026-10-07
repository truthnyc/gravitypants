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
