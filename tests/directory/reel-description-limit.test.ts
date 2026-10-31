import { describe, expect, it } from "vitest";
import { REEL_DESCRIPTION_MAX } from "@/lib/directory/directory";
import { shareSchema } from "@/lib/directory/directory.functions";

const base = {
  adId: "00000000-0000-4000-8000-000000000001",
  brand: { name: "North Star", website_url: "https://example.com", category: "Home & Living" },
  tags: [],
  moods: [],
  show: true,
  fullName: "Jane Smith",
  jobTitle: "",
  agreed: true,
  posterPath: null,
};

describe("Reel description limit", () => {
  it("allows 300 characters", () => {
    expect(REEL_DESCRIPTION_MAX).toBe(300);
    expect(shareSchema.safeParse({ ...base, description: "a".repeat(300) }).success).toBe(true);
  });
  it("rejects 301 characters", () => {
    expect(shareSchema.safeParse({ ...base, description: "a".repeat(301) }).success).toBe(false);
  });
});
