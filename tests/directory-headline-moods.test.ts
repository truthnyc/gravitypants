import { describe, expect, it } from "vitest";
import { activeHeadlineMoods, mergeSettings, DEFAULT_DIRECTORY_SETTINGS } from "../src/lib/directory/settings";

describe("headline mood end dates", () => {
  const list = [{ mood: "black friday", until: "2026-11-30" }, { mood: "cozy", until: null }];
  it("shows Black Friday through Nov 30 in New York", () => {
    expect(activeHeadlineMoods(list, new Date("2026-12-01T04:30:00Z"))).toEqual(["black friday", "cozy"]);
  });
  it("drops Black Friday on Dec 1 in New York", () => {
    expect(activeHeadlineMoods(list, new Date("2026-12-01T06:00:00Z"))).toEqual(["cozy"]);
  });
  it("keeps old saved mood lists working without dates", () => {
    expect(mergeSettings({ headlineMoods: ["cozy"] }).headlineMoods).toEqual([{ mood: "cozy", until: null }]);
  });
});

describe("directory paging defaults", () => {
  it("shows 12 reels per page and auto-loads 2 pages", () => {
    expect(DEFAULT_DIRECTORY_SETTINGS.pageSize).toBe(12);
    expect(DEFAULT_DIRECTORY_SETTINGS.autoLoadPages).toBe(2);
  });
});
