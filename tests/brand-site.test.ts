import { describe, expect, it } from "vitest";
import { aimanteIn, aimanteOut, siteForHost } from "@/lib/site/brand-site";

const u = (s: string) => new URL(s);

describe("aimante domain", () => {
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
