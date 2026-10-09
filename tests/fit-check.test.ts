import { describe, expect, it } from "vitest";
import { findProblems } from "../src/components/editor/fit-check";

describe("fit warnings", () => {
  it("flags an element outside the frame", () => {
    expect(findProblems({ headline: { x: -10, y: 10, w: 100, h: 20 } }, 1000, 1000)).toEqual(["the headline is cut off"]);
  });
  it("flags overlap within 3% breathing room", () => {
    const p = findProblems({ subline: { x: 0, y: 0, w: 100, h: 100 }, logo: { x: 120, y: 0, w: 50, h: 50 } }, 1000, 1000);
    expect(p).toEqual(["the subline overlaps the logo"]);
  });
  it("passes elements with enough space", () => {
    expect(findProblems({ headline: { x: 0, y: 0, w: 100, h: 100 }, logo: { x: 200, y: 0, w: 50, h: 50 } }, 1000, 1000)).toEqual([]);
  });
});
