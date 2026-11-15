import { describe, expect, it } from "vitest";
import { stageFilters, stagePages } from "@/lib/directory/stage";

describe("stage search continuity", () => {
  it("keeps the text query, including unmatched sentence words", () => {
    expect(stageFilters({ q: "striped jacket" }).q).toBe("striped jacket");
  });
  it("keeps the selected brand", () => {
    expect(stageFilters({ brands: "beamier" }).brands).toEqual(["beamier"]);
  });
  it("keeps all selected moods rather than only the last mood", () => {
    expect(stageFilters({ moods: "cozy|bold" }).moods).toEqual(["cozy", "bold"]);
  });
  it("includes a clicked reel beyond 240 matches in the original order", async () => {
    const rows = Array.from({ length: 241 }, (_, i) => `reel-${i}`);
    const pages: number[] = [];
    const result = await stagePages(async (page) => {
      pages.push(page);
      return { reels: rows.slice((page - 1) * 240, page * 240), hasMore: page === 1 };
    });
    expect(pages).toEqual([1, 2]);
    expect(result).toEqual(rows);
    expect(result.indexOf("reel-240")).toBe(240);
  });
});