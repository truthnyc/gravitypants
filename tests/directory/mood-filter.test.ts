import { describe, expect, it } from "vitest";
import { matchesMood } from "../../src/lib/directory/mood-filter";
describe("Directory mood filter", () => {
  it("shows all reels without a selection", () => {
    expect(matchesMood(undefined, ["bold"])).toBe(true);
  });
  it("matches exact reel moods", () => {
    expect(matchesMood("cozy", ["cozy"])).toBe(true);
    expect(matchesMood("cozy", ["bold"])).toBe(false);
    expect(matchesMood("cozy", ["cozy-looking"])).toBe(false);
  });
  it("matches website reels via brand moods", () => {
    expect(matchesMood("elegant", [], ["elegant"])).toBe(true);
    expect(matchesMood("bold", [], ["elegant"])).toBe(false);
  });
});
