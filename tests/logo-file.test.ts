import { describe, expect, it } from "vitest";
import { isLightArtwork, logoFileError, weightChoices } from "../src/lib/stillframe/logo-file";

describe("logo upload rules", () => {
  it("rejects files over 5 MB", () => {
    expect(logoFileError({ type: "image/png", size: 5 * 1024 * 1024 + 1, name: "a.png" })).toMatch(/5 MB/);
    expect(logoFileError({ type: "image/png", size: 5 * 1024 * 1024, name: "a.png" })).toBeNull();
  });
  it("rejects other file types", () => {
    expect(logoFileError({ type: "image/gif", size: 10, name: "a.gif" })).not.toBeNull();
    expect(logoFileError({ type: "image/svg+xml", size: 10, name: "a.svg" })).toBeNull();
  });
  it("classifies white artwork as the light logo and ignores transparent pixels", () => {
    expect(isLightArtwork([255, 255, 255, 255, 0, 0, 0, 0])).toBe(true);
    expect(isLightArtwork([20, 20, 20, 255, 255, 255, 255, 0])).toBe(false);
  });
  it("offers at most four weights", () => {
    expect(weightChoices([100, 200, 300, 400, 500, 600, 700, 800, 900])).toEqual([300, 400, 600, 700]);
    expect(weightChoices([400])).toEqual([400]);
  });
});
