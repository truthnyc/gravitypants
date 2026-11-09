import { describe, expect, it } from "vitest";
import { normalizeMoodName, moodRequestInput, reelMoodsInput } from "@/lib/directory/mood-admin";

/** Moods are added by hand at any count, and names people type are cleaned before they become requests. */
describe("manual mood control", () => {
  it("cleans a typed mood name the way the master list stores it", () => {
    expect(normalizeMoodName("  Sun-Warmed   Studio ")).toBe("sun-warmed studio");
    expect(normalizeMoodName("Cozy!!")).toBe("cozy");
    expect(normalizeMoodName("  ")).toBeNull();
    expect(normalizeMoodName("a")).toBeNull();
    expect(normalizeMoodName("x".repeat(31))).toBeNull();
  });

  it("accepts a mood request with a name and an optional workspace", () => {
    expect(moodRequestInput.safeParse({ name: "Sun-warmed" }).success).toBe(true);
    expect(moodRequestInput.safeParse({ name: "Sun-warmed", workspaceId: "11111111-1111-4111-8111-111111111111" }).success).toBe(true);
    expect(moodRequestInput.safeParse({ name: "a" }).success).toBe(false);
    expect(moodRequestInput.safeParse({ name: "Sun-warmed", workspaceId: "not-a-uuid" }).success).toBe(false);
  });

  it("lets a brand owner set any number of moods on one reel", () => {
    const six = ["cozy", "rustic", "warm", "earthy", "quiet", "honest"];
    const parsed = reelMoodsInput.safeParse({ adId: "11111111-1111-4111-8111-111111111111", moods: six });
    expect(parsed.success).toBe(true);
    expect(reelMoodsInput.safeParse({ adId: "11111111-1111-4111-8111-111111111111", moods: Array.from({ length: 61 }, (_, i) => `mood-${i}`) }).success).toBe(false);
    expect(reelMoodsInput.safeParse({ adId: "not-a-uuid", moods: six }).success).toBe(false);
  });
});
