import { describe, it, expect } from "vitest";
import { isAdParam } from "./meta-pixel";
describe("isAdParam", () => {
  it("drops campaign identifiers", () => { for (const k of ["utm_source", "gclid", "fbclid", "gbraid"]) expect(isAdParam(k)).toBe(true); });
  it("keeps Stage page state", () => { for (const k of ["start", "seed", "moods", "q"]) expect(isAdParam(k)).toBe(false); });
});
