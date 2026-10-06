import { describe, expect, it } from "vitest";
import { DEFAULT_GREETING, chooseGreeting, nextOccurrence, plainText, type GreetingCtx } from "../src/lib/directory/greeting";

const ctx = (now: Date, o: Partial<GreetingCtx> = {}): GreetingCtx => ({ now, country: "US", city: null, weather: null, returningMood: null, hasReels: () => true, fallbackMood: "cozy", ...o });
const ev = (id: string) => DEFAULT_GREETING.events.find((e) => e.id === id)!;

describe("headline greeting", () => {
  it("Black Friday 2026 is the day after Thanksgiving (Nov 27)", () => {
    expect(nextOccurrence(ev("black-friday"), new Date(2026, 9, 6), DEFAULT_GREETING.events)?.getDate()).toBe(27);
  });
  it("Black Friday countdown reads 12 days out", () => {
    const c = chooseGreeting(DEFAULT_GREETING, ctx(new Date(2026, 10, 15, 16)));
    expect(plainText(c.filled)).toBe("Black Friday is in 12 days.");
  });
  it("US-only dates are hidden for unknown countries", () => {
    const c = chooseGreeting(DEFAULT_GREETING, ctx(new Date(2026, 4, 3, 16), { country: null }));
    expect(c.source).not.toContain("Mother");
  });
  it("rain picks the cozy weather greeting", () => {
    const c = chooseGreeting(DEFAULT_GREETING, ctx(new Date(2026, 6, 7, 16), { weather: { kind: "rain", tempC: 15, isDay: true, sunset: null } }));
    expect([plainText(c.filled), c.mood]).toEqual(["Rainy Tuesday.", "cozy"]);
  });
  it("fun day is skipped when its category has no reels", () => {
    const c = chooseGreeting(DEFAULT_GREETING, ctx(new Date(2026, 9, 1, 16), { hasReels: () => false }));
    expect(c.rule).not.toBe("fun_day");
  });
  it("falls back to Happy {day}", () => {
    const c = chooseGreeting(DEFAULT_GREETING, ctx(new Date(2026, 6, 8, 16)));
    expect(plainText(c.filled)).toBe("Happy Wednesday.");
  });
});

describe("headline greeting QA", () => {
  const C = DEFAULT_GREETING;
  it("Nov 27 2026 reads Black Friday is today", () => {
    expect(plainText(chooseGreeting(C, ctx(new Date(2026, 10, 27, 16))).filled)).toBe("Black Friday is today.");
  });
  it("UK visitor never sees US Mother's Day (May 3 2026)", () => {
    const c = chooseGreeting(C, ctx(new Date(2026, 4, 3, 16), { country: "GB" }));
    expect(c.source).not.toContain("Mother");
  });
  it("US visitor sees Mother's Day countdown May 3 2026", () => {
    expect(chooseGreeting(C, ctx(new Date(2026, 4, 3, 16))).source).toBe("Countdown — Mother's Day");
  });
  it("active campaign overrides, ended campaign does not", () => {
    const camp = { template: "**Sale** is on.", mood: "bold", category: null, brand: null, startsAt: "2026-11-01T00:00", endsAt: "2026-11-20T00:00" };
    expect(chooseGreeting({ ...C, campaign: camp }, ctx(new Date(2026, 10, 15, 16))).rule).toBe("campaign");
    expect(chooseGreeting({ ...C, campaign: camp }, ctx(new Date(2026, 10, 21, 16))).rule).toBe("countdown");
  });
  it("turning countdown off changes the result", () => {
    const off = { ...C, rules: C.rules.map((r) => (r.type === "countdown" ? { ...r, enabled: false } : r)) };
    expect(chooseGreeting(off, ctx(new Date(2026, 10, 15, 16))).rule).not.toBe("countdown");
  });
  it("moving day_of_week above countdown wins on a Friday", () => {
    const rules = [{ type: "day_of_week" as const, enabled: true }, ...C.rules.filter((r) => r.type !== "day_of_week")];
    expect(chooseGreeting({ ...C, rules }, ctx(new Date(2026, 10, 20, 16))).rule).toBe("day_of_week");
  });
  it("missing weather falls through to a later rule", () => {
    expect(chooseGreeting(C, ctx(new Date(2026, 6, 7, 16), { weather: null })).rule).toBe("fallback");
  });
});
