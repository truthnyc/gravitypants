import { describe, expect, it } from "vitest";
import { mergeKeywords } from "../src/lib/directory/keywords";

const sample = "mohair bandana, knit bandana scarf, free knitting pattern, Paintbrush Mohair, mohair scarf, kerchief knitting pattern, tip to tip bandana, quick knit gift, easy knitting pattern, holiday gift knits, handmade gift, Purl Soho pattern, beginner mohair project";

describe("mergeKeywords", () => {
  it("splits the pasted list into 13 keywords", () => {
    const r = mergeKeywords([], sample);
    expect(r).toHaveLength(13);
    expect(r[0]).toBe("mohair bandana");
    expect(r[3]).toBe("paintbrush mohair");
    expect(r[12]).toBe("beginner mohair project");
  });
  it("drops duplicates", () => {
    expect(mergeKeywords(["mohair scarf"], "Mohair scarf, handmade gift")).toEqual(["mohair scarf", "handmade gift"]);
  });
  it("caps at 20 keywords", () => {
    expect(mergeKeywords([], Array.from({ length: 30 }, (_, i) => `k${i}`).join(","))).toHaveLength(20);
  });
});
