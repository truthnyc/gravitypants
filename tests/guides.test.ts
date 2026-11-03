import { describe, expect, it } from "vitest";
import { guideForEvent, seasonNote } from "@/lib/directory/guides";

const sd = { season: "singles-day", season_label: "Singles' Day", start_date: "2026-10-28", end_date: "2026-11-11" };

describe("guides", () => {
  it("counts down inside the season", () => expect(seasonNote(sd, new Date("2026-11-03T12:00:00Z"))).toBe("Singles' Day is in 8 days."));
  it("says back next year outside the season (never hides)", () => expect(seasonNote(sd, new Date("2027-02-01T12:00:00Z"))).toBe("Back for Singles' Day next year."));
  it("matches homepage countdown events to guides", () => {
    const gs = [{ slug: "h", season: "holiday" }, { slug: "s", season: "singles-day" }];
    expect(guideForEvent(gs, "singles-day")?.slug).toBe("s");
    expect(guideForEvent(gs, "holiday-gifting")?.slug).toBe("h");
    expect(guideForEvent(gs, "black-friday")).toBeUndefined();
  });
});
