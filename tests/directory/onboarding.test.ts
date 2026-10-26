import { describe, expect, it } from "vitest";
import { createBrandInput } from "../../src/lib/directory/admin-fields";
import { normalizeWebsite } from "../../src/lib/directory/application-security";

const input = { name: "Test shop", website: "https://example.com", slug: "test-shop", category: "Other", description: "", workspaceId: null, siteReelIds: [] };
describe("Admin shop onboarding", () => {
  it("retains explicit client ownership without inventing a workspace", () => {
    const workspaceId = "00000000-0000-4000-8000-000000000001";
    expect(createBrandInput.parse({ ...input, workspaceId }).workspaceId).toBe(workspaceId);
    expect(createBrandInput.parse(input).workspaceId).toBeNull();
    expect(createBrandInput.safeParse({ ...input, workspaceId: "unknown" }).success).toBe(false);
  });
  it("allows an explicit private draft and defaults affiliation off", () => {
    expect(createBrandInput.parse({ ...input, status: "draft" })).toMatchObject({ status: "draft", affiliated: false });
    expect(createBrandInput.safeParse({ ...input, status: "approved" }).success).toBe(false);
  });
  it("enforces the existing three-mood maximum", () => {
    expect(createBrandInput.parse({ ...input, moods: ["Cozy", "Warm", "Calm"] }).moods).toEqual(["cozy", "warm", "calm"]);
    expect(createBrandInput.safeParse({ ...input, moods: ["cozy", "warm", "calm", "bright"] }).success).toBe(false);
  });
  it("recognizes duplicate website variants", () => {
    expect(normalizeWebsite("https://example.com").key).toBe(normalizeWebsite("http://www.example.com/shop").key);
    expect(normalizeWebsite("https://another.example.com").key).not.toBe(normalizeWebsite("https://example.com").key);
  });
});