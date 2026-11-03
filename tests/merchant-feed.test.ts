import { describe, expect, it } from "vitest";
import { feedItems } from "@/lib/site/merchant-feed";

describe("merchant feed", () => {
  it("lists Starter, Business and Team at their real prices, not retired Simple", () => {
    const by = Object.fromEntries(feedItems().map((i) => [i.id, i.price]));
    expect(by["gp-starter-monthly"]).toBe(19);
    expect(by["gp-starter-yearly"]).toBe(190);
    expect(by["gp-business-monthly"]).toBe(79);
    expect(by["gp-team-yearly"]).toBe(1750);
    expect(Object.keys(by).some((k) => k.includes("simple"))).toBe(false);
  });
});
