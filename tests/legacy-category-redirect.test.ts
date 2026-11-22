import { describe, expect, it } from "vitest";
import { aimanteOut, legacyCategoryRedirect } from "@/lib/site/brand-site";

const aim = (path: string) => legacyCategoryRedirect(`https://aimante.co${path}`, "aimante.co", null);

describe("old Aimanté category links", () => {
  it("keeps tracking parameters on the Nonprofit category page", () => expect(aim("/?category=nonprofit-causes&utm_source=chat")).toBe("/c/nonprofit-events?utm_source=chat"));
  it("preview and paging parameters do not turn a category into home", () => {
    const out = aimanteOut(new URL("https://preview.test/directory?category=nonprofit-causes&brand=aimante&seed=visit&page=2#reels"), "aimante");
    expect(out?.pathname).toBe("/c/nonprofit-events");
    expect(out?.searchParams.get("seed")).toBe("visit");
    expect(out?.searchParams.get("page")).toBe("2");
    expect(out?.hash).toBe("#reels");
  });
  it("preserves a real brand filter rather than broadening the category", () => {
    const out = aimanteOut(new URL("https://aimante.co/directory?category=nonprofit-events&brand=msf"), "aimante");
    expect(out?.pathname).toBe("/");
    expect(out?.searchParams.get("brand")).toBe("msf");
  });
  it("home ?category=nonprofit-causes goes to /c/nonprofit-events", () => expect(aim("/?category=nonprofit-causes")).toBe("/c/nonprofit-events"));
  it("events-entertainment goes to /c/nonprofit-events", () => expect(aim("/c/events-entertainment")).toBe("/c/nonprofit-events"));
  it("fashion-apparel goes to /c/fashion", () => expect(aim("/?category=fashion-apparel")).toBe("/c/fashion"));
  it("current slugs are left alone", () => expect(aim("/c/nonprofit-events")).toBeNull());
  it("Gravity Pants pages are left alone", () => expect(legacyCategoryRedirect("https://gravitypants.com/?category=nonprofit-causes", "gravitypants.com", null)).toBeNull());
});
