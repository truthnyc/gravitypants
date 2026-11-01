import { describe, expect, it } from "vitest";
import { adLoops, GOOGLE_ADS_MAX_ZIP_BYTES, isGoogleAdsSize } from "@/render/google-ads";

describe("Google Ads HTML5 rules", () => {
  it("caps the zip at 600 KB", () => expect(GOOGLE_ADS_MAX_ZIP_BYTES).toBe(614400));
  it("keeps total animation within 30 seconds", () => expect(adLoops(0, 12)).toBe(2));
  it("turns play-forever into at most 3 plays", () => expect(adLoops(0, 5)).toBe(3));
  it("always plays at least once", () => expect(adLoops(1, 45)).toBe(1));
  it("accepts 300x250 and rejects 1080x1350", () => {
    expect(isGoogleAdsSize(300, 250)).toBe(true);
    expect(isGoogleAdsSize(1080, 1350)).toBe(false);
  });
});
