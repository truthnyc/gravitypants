import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REEL_DESCRIPTION_MAX } from "@/lib/directory/directory";
import { shareSchema } from "@/lib/directory/directory.functions";

/** Latest drizzle migration that (re)defines the reel description check constraint. */
function latestReelDescriptionMigration(): string {
  const files = readdirSync("drizzle/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => Number(a.split("_")[0]) - Number(b.split("_")[0]));
  for (const f of [...files].reverse()) {
    const sql = readFileSync(`drizzle/migrations/${f}`, "utf8");
    if (sql.includes("directory_reels_description_check")) return sql;
  }
  return "";
}

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
