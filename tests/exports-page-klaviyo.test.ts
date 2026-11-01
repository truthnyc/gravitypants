import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Klaviyo's image library takes animated GIFs, not MP4s, so the Previous
// Exports page must offer the button on GIF rows only — and ask the server
// whether the brand is connected once for the page, not once per row.
describe("Previous Exports page Klaviyo button", () => {
  const src = readFileSync("src/routes/_authenticated/app/exports.tsx", "utf8");

  it("offers Klaviyo only on .gif rows", () => {
    expect(src).toContain("{/\\.gif$/i.test(f) && <KlaviyoSend");
  });

  it("checks the connection once and shares it with every row", () => {
    expect(src).toContain("connected={klaviyoConnected}");
    expect(src).toContain("useState<boolean | null>(null)");
    expect(src).toContain("<KlaviyoDisconnect />");
  });
});
