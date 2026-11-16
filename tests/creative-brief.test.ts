import { describe, expect, it } from "vitest";
import { briefTags, detectMoods, parseCreativeBrief } from "@/lib/directory/creative-brief";

const sample = `Moods

Cold, calm and technical: a grey studio, cool light, nothing extra

Scandinavian minimalism: neutral grey with a flash of signal orange

Colour palette: charcoal ripstop, light-grey background, signal orange (#E8603C-ish) for the lining and the text.

Tags

Brand / product:
#StellarEquipment #StellarEQ

Category:
#DownJacket #850Fill

Keyword tags (for alt text / SEO): down parka, 850 fill power, two-way zip`;

describe("parseCreativeBrief", () => {
  const b = parseCreativeBrief(sample);
  it("reads scenes", () => expect(b.scenes.map((s) => s.title)).toEqual(["Cold, calm and technical", "Scandinavian minimalism"]));
  it("reads palette colours", () => expect(b.colors).toEqual(["#E8603C"]));
  it("groups hashtags", () => expect(b.tagGroups).toEqual([{ label: "Brand / product", tags: ["StellarEquipment", "StellarEQ"] }, { label: "Category", tags: ["DownJacket", "850Fill"] }]));
  it("reads keywords", () => expect(b.keywords).toEqual(["down parka", "850 fill power", "two-way zip"]));
  it("detects master moods", () => expect(detectMoods(b, ["calm", "minimal", "warm"])).toEqual(["calm", "minimal"]));
  it("builds lowercase tags", () => expect(briefTags(b)).toEqual(["stellarequipment", "stellareq", "downjacket", "850fill", "down parka", "850 fill power", "two-way zip"]));
});
