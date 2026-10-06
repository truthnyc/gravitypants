import { describe, expect, it } from "vitest";
import { MOOD_FAMILIES, moodInput } from "../../src/lib/directory/mood-admin";
describe("Master mood management", () => {
  it("stores one normalized name irrespective of capitalization", () => {
    expect(moodInput.parse({ name: " Elegant ", family: "Luxe" }).name).toBe("elegant");
  });
  it("accepts all 11 existing mood families", () => {
    expect(MOOD_FAMILIES).toHaveLength(11);
    for (const family of MOOD_FAMILIES) expect(moodInput.parse({ name: "test", family }).family).toBe(family);
    expect(moodInput.safeParse({ name: "test", family: "Unknown" }).success).toBe(false);
  });
});