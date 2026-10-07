import { describe, expect, it } from "vitest";
import { aimanteIn, aimanteOut, domainRedirect, siteForHost } from "@/lib/site/brand-site";

const u = (s: string) => new URL(s);

describe("aimante domain", () => {
  it("keeps Aimanté sign-in on its own domain and maps the shared sign-in page", () => {
    expect(domainRedirect("https://aimante.co/sign-in")).toBeNull();
    expect(domainRedirect("https://www.aimante.co/sign-in")).toBeNull();
    expect(aimanteIn(u("https://aimante.co/sign-in"))?.pathname).toBe("/signin");
    expect(aimanteOut(u("https://aimante.co/signin"))?.pathname).toBe("/sign-in");
    expect(domainRedirect("https://aimante.co/sign-up")).toBeNull();
    expect(aimanteIn(u("https://aimante.co/sign-up"))?.pathname).toBe("/signup");
    expect(aimanteOut(u("https://aimante.co/signup"))?.pathname).toBe("/sign-up");
  });
  it("only aimante.co and www.aimante.co serve Aimanté", () => {
    expect(siteForHost("aimante.co")).toBe("aimante");
    expect(siteForHost("www.aimante.co")).toBe("aimante");
    expect(siteForHost("gravitypants.com")).toBe("gravitypants");
  });
  it("maps public addresses to the Directory", () => {
    expect(aimanteIn(u("https://aimante.co/"))?.pathname).toBe("/directory");
    expect(aimanteIn(u("https://aimante.co/c/food-drink"))?.search).toBe("?category=food-drink");
    expect(aimanteIn(u("https://aimante.co/mood/cozy"))?.search).toBe("?mood=cozy");
    expect(aimanteIn(u("https://aimante.co/b/purl-soho"))?.pathname).toBe("/directory/purl-soho");
    expect(aimanteIn(u("https://aimante.co/join"))?.pathname).toBe("/aimante/join");
    expect(aimanteIn(u("https://gravitypants.com/"))).toBeUndefined();
  });
  it("shows brand links as /b/:brand", () => {
    expect(aimanteOut(u("https://aimante.co/directory/purl-soho"))?.pathname).toBe("/b/purl-soho");
    expect(aimanteOut(u("https://aimante.co/directory?mood=cozy"))?.pathname).toBe("/mood/cozy");
  });
});

import { domainRedirect, resolveSite } from "@/lib/site/brand-site";

describe("domain redirects", () => {
  it("aimante.co sends non-Aimanté pages to the same path on gravitypants.com", () => {
    expect(domainRedirect("https://aimante.co/pricing?x=1")).toBe("https://gravitypants.com/pricing?x=1");
    expect(domainRedirect("https://aimante.co/b/purl-soho")).toBeNull();
    expect(domainRedirect("https://aimante.co/")).toBeNull();
  });
  it("gravitypants.com/directory goes to aimante.co", () => {
    expect(domainRedirect("https://gravitypants.com/directory")).toBe("https://aimante.co/");
    expect(domainRedirect("https://www.gravitypants.com/directory/purl-soho")).toBe("https://aimante.co/b/purl-soho");
    expect(domainRedirect("https://gravitypants.com/directory/category/crafts-hobbies")).toBeNull();
    expect(domainRedirect("https://gravitypants.com/pricing")).toBeNull();
  });
  it("uses the original visitor domain forwarded by hosting", () => {
    expect(domainRedirect("https://gravitypants.lovable.app/directory/purl-soho", "gravitypants.com")).toBe("https://aimante.co/b/purl-soho");
    expect(domainRedirect("https://gravitypants.lovable.app/pricing?x=1", "aimante.co")).toBe("https://gravitypants.com/pricing?x=1");
  });
  it("previews never redirect and honour ?brand=aimante", () => {
    expect(domainRedirect("https://id-preview--x.lovable.app/directory")).toBeNull();
    expect(resolveSite("id-preview--x.lovable.app", "aimante", null)).toBe("aimante");
    expect(resolveSite("gravitypants.com", "aimante", "aimante")).toBe("gravitypants");
  });
});
