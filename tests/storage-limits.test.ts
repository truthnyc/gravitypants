import { describe, expect, it } from "vitest";
import { storageAlertAction, storageLimitFor } from "@/lib/stillframe/storage-limits";
const GB = 1024 ** 3;
describe("storage limits", () => {
  it("free is 1 GB", () => expect(storageLimitFor(null)).toBe(1 * GB));
  it("starter is 5 GB", () => expect(storageLimitFor("starter_yearly")).toBe(5 * GB));
  it("business is 20 GB", () => expect(storageLimitFor("business")).toBe(20 * GB));
  it("team is 50 GB", () => expect(storageLimitFor("team")).toBe(50 * GB));
  it("sends at 80%", () => expect(storageAlertAction(0.8 * GB, GB, false)).toBe("send"));
  it("no send below 80%", () => expect(storageAlertAction(0.79 * GB, GB, false)).toBe("none"));
  it("sends only once", () => expect(storageAlertAction(0.9 * GB, GB, true)).toBe("none"));
  it("resets below 80%", () => expect(storageAlertAction(0.5 * GB, GB, true)).toBe("reset"));
  it("one add-on adds 10 GB on Starter", () => expect(storageLimitFor("starter", 1)).toBe(15 * GB));
  it("add-ons stack", () => expect(storageLimitFor("business_yearly", 3)).toBe(50 * GB));
  it("free never gets add-on space", () => expect(storageLimitFor(null, 2)).toBe(1 * GB));
});
