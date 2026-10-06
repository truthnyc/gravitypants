import { describe, expect, it } from "vitest";
import { facetedInput, DIRECTORY_PAGE_SIZE } from "@/lib/directory/directory.functions";
import { MOOD_FAMILIES, MOOD_FAMILY_COLORS } from "@/lib/directory/mood-admin";

describe("directory faceted search", () => {
  it("defaults to page 1 of 12", () => {
    const d = facetedInput.parse({});
    expect(d.page).toBe(1);
    expect(d.pageSize).toBe(DIRECTORY_PAGE_SIZE);
    expect(DIRECTORY_PAGE_SIZE).toBe(12);
  });
  it("every family has a colour; Playful and Festive use dark text", () => {
    for (const f of MOOD_FAMILIES) expect(MOOD_FAMILY_COLORS[f]).toBeTruthy();
    expect(MOOD_FAMILY_COLORS.Playful).toEqual({ bg: "#e6a700", ink: "dark" });
    expect(MOOD_FAMILY_COLORS.Festive).toEqual({ bg: "#c79a12", ink: "dark" });
    expect(MOOD_FAMILY_COLORS.Calm.ink).toBe("light");
  });
});
