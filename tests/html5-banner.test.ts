import { describe, expect, it } from "vitest";
import { bannerHtml, safeClickUrl } from "@/render/html5-doc";

describe("HTML5 banner", () => {
  it("adds https to a bare shop address", () => {
    expect(safeClickUrl("gravitypants.com")).toBe("https://gravitypants.com/");
  });
  it("refuses non-web links as the click-through", () => {
    expect(safeClickUrl("javascript:alert(1)")).toBe("");
  });
  it("declares the exact banner size for ad platforms", () => {
    expect(bannerHtml("Ad", 300, 250, "", "{}")).toContain('<meta name="ad.size" content="width=300,height=250">');
  });
  it("embedded ad text cannot close the script tag", () => {
    expect(bannerHtml("Ad", 300, 250, "", JSON.stringify({ t: "</script>" }))).not.toContain('"</script>"');
  });
});
