import { describe, expect, it } from "vitest";
import { capMoodTags, splitByKind, withinMoodCap, REEL_MOODS_MAX, type TagKind } from "@/lib/directory/tag-kinds";
import { parseSearch } from "@/lib/directory/parse-search";
import { readFileSync } from "node:fs";

const KIND: Record<string, TagKind> = { gift: "occasion", "black friday": "occasion", winter: "season", summer: "season", coastal: "setting", urban: "setting", home: "setting" };
const kindOf = (n: string): TagKind => KIND[n] ?? "mood";

describe("reel tag kinds", () => {
  it("limits Mood to 3 per reel", () => expect(REEL_MOODS_MAX).toBe(3));
  it("does not count Occasion, Season or Setting toward the Mood limit", () => {
    expect(withinMoodCap(["calm", "cozy", "elegant", "gift", "winter", "coastal"], kindOf)).toBe(true);
    expect(withinMoodCap(["calm", "cozy", "elegant", "bold"], kindOf)).toBe(false);
  });
  it("trims extra moods but keeps every other tag", () =>
    expect(capMoodTags(["calm", "gift", "cozy", "elegant", "bold", "winter"], kindOf)).toEqual(["calm", "gift", "cozy", "elegant", "winter"]));
  it("splits tags into the four filters", () =>
    expect(splitByKind(["calm", "gift", "winter", "urban"], kindOf)).toEqual({ mood: ["calm"], occasion: ["gift"], season: ["winter"], setting: ["urban"] }));
});

describe("search reads occasions, seasons and settings", () => {
  const catalog = { moods: ["cozy", "calm"], brands: [], kinds: { occasion: ["gift", "black friday", "holiday"], season: ["winter", "summer"], setting: ["coastal", "home"] }, aliases: { cold: "winter", serene: "calm" } };
  it("picks one of each", () => expect(parseSearch("cozy winter gift", catalog).tags).toEqual(["cozy", "gift", "winter"]));
  it("reads two-word occasions", () => expect(parseSearch("black friday", catalog).tags).toEqual(["black friday"]));
  it("follows retired names", () => expect(parseSearch("serene cold", catalog).tags).toEqual(["calm", "winter"]));
  it("keeps 'home' as the Home & Living category", () => expect(parseSearch("home", catalog).categories).toEqual(["home-living"]));
});

describe("mood remap migration", () => {
  const sql = readFileSync("drizzle/migrations/0051_mood_kinds_and_remap.sql", "utf8");
  const pairs: [string, string][] = [
    ["serene", "calm"], ["soothing", "calm"], ["relaxed", "calm"], ["dark", "moody"], ["fun", "playful"], ["cheerful", "playful"],
    ["lively", "energetic"], ["dynamic", "energetic"], ["punchy", "energetic"], ["refined", "elegant"], ["sophisticated", "elegant"],
    ["warm", "cozy"], ["organic", "natural"], ["heritage", "timeless"], ["indulgent", "luxurious"], ["cold", "winter"], ["sunny", "summer"],
    ["celebratory", "celebration"], ["festive", "holiday"],
  ];
  for (const [a, b] of pairs) it(`maps ${a} to ${b}`, () => expect(sql).toContain(`('${a}','${b}')`));
  it("backs up original tags before changing them", () => expect(sql.indexOf("mood_remap_backup (table_name")).toBeLessThan(sql.indexOf("UPDATE public.directory_reels SET moods")));
});
