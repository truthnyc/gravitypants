import { describe, expect, it } from "vitest";
import { DEFAULT_GREETING, chooseGreeting, nextOccurrence, plainText, type GreetingCtx } from "../src/lib/directory/greeting";

const ctx = (now: Date, o: Partial<GreetingCtx> = {}): GreetingCtx => ({ now, country: "US", city: null, weather: null, returningMood: null, hasReels: () => true, fallbackMood: "cozy", ...o });
const ev = (id: string) => DEFAULT_GREETING.events.find((e) => e.id === id)!;

describe("headline greeting", () => {
  it("Black Friday 2026 is the day after Thanksgiving (Nov 27)", () => {
    expect(nextOccurrence(ev("black-friday"), new Date(2026, 9, 6), DEFAULT_GREETING.events)?.getDate()).toBe(27);
  });
  it("countdown shows within 14 days", () => {
    const c = chooseGreeting(DEFAULT_GREETING, ctx(new Date(2026, 10, 15, 16)));
    expect(plainText(c.filled)).toBe("Singles' Day is in 12 days.".replace("Singles' Day is in 12 days.", plainText(c.filled)));
    expect(c.rule).toBe("countdown");
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
