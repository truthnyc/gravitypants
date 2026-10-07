import { describe, expect, it } from "vitest";

import { renderErrorPage } from "../src/lib/error-page";

describe("service unavailable page", () => {
  it("brands aimante.co failures as Aimanté", () => {
    const html = renderErrorPage({ host: "www.aimante.co" });
    expect(html).toContain("Aimanté");
    expect(html).toContain("We’ll be right back.");
  });

  it("brands other failures as Gravity Pants", () => {
    const html = renderErrorPage({ host: "gravitypants.com" });
    expect(html).toContain("Gravity Pants");
    expect(html).toContain("Check service status");
  });
});