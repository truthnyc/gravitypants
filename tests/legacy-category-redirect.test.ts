import { describe, expect, it } from "vitest";
import { legacyCategoryRedirect } from "@/lib/site/brand-site";

const aim = (path: string) => legacyCategoryRedirect(`https://aimante.co${path}`, "aimante.co", null);

describe("old Aimanté category links", () => {
  it("home ?category=nonprofit-causes goes to /c/nonprofit-events", () => expect(aim("/?category=nonprofit-causes")).toBe("/c/nonprofit-events"));
  it("events-entertainment goes to /c/nonprofit-events", () => expect(aim("/c/events-entertainment")).toBe("/c/nonprofit-events"));
  it("fashion-apparel goes to /c/fashion", () => expect(aim("/?category=fashion-apparel")).toBe("/c/fashion"));
  it("current slugs are left alone", () => expect(aim("/c/nonprofit-events")).toBeNull());
  it("Gravity Pants pages are left alone", () => expect(legacyCategoryRedirect("https://gravitypants.com/?category=nonprofit-causes", "gravitypants.com", null)).toBeNull());
});
