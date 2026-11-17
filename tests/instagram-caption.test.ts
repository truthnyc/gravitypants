import { describe, it, expect } from "vitest";
import { reelHashtags, toHashtag } from "@/lib/site/instagram-caption";

describe("instagram hashtags", () => {
  it("joins phrases", () => expect(toHashtag("down parka")).toBe("#DownParka"));
  it("dedupes and ends with GravityPants", () => {
    expect(reelHashtags("Sail Racing", ["#SailRacing", "alpine"])).toEqual(["#SailRacing", "#alpine", "#GravityPants"]);
  });
  it("caps at 30", () => {
    const h = reelHashtags("B", Array.from({ length: 40 }, (_, i) => `t${i}`));
    expect(h.length).toBe(30);
    expect(h[29]).toBe("#GravityPants");
  });
});
