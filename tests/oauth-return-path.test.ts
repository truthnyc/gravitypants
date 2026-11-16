import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "../src/lib/oauth-return-path";
describe("OAuth return boundary", () => {
  it("preserves consent request and fragment", () => expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc#approve")).toBe("/.lovable/oauth/consent?authorization_id=abc#approve"));
  it("rejects external redirects", () => {
    for (const value of ["//evil.example", "/\\evil.example", "/\nevil", "https://evil.example"]) expect(oauthReturnPath(value)).toBe("/");
  });
});