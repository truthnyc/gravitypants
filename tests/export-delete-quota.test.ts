import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Deleting an export must never refund it: the export_usage row is what
// record_export/export_status count, so removing it would let plan limits
// (3 trial exports, 10/month on Simple, etc.) be bypassed.
describe("deleteMyExport quota safety", () => {
  const src = readFileSync("src/lib/stillframe/account.functions.ts", "utf8");
  const fn = src.slice(src.indexOf("deleteMyExport"), src.indexOf("deleteMyAccount"));

  it("removes the export record but keeps the usage row", () => {
    expect(fn).toContain('from("exports").delete()');
    expect(fn).not.toContain('from("export_usage").delete()');
  });
});
