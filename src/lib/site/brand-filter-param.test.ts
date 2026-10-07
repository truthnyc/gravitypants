import { describe, expect, it } from "vitest";
import { aimanteIn } from "./brand-site";

describe("Aimanté brand filter", () => {
  it("keeps a chosen brand on aimante.co", () => {
    expect(aimanteIn(new URL("https://aimante.co/?brand=agnona"), "aimante")?.searchParams.get("brand")).toBe("agnona");
  });
  it("still drops the preview site switch", () => {
    expect(aimanteIn(new URL("https://x.lovable.app/?brand=aimante"), "aimante")?.searchParams.get("brand")).toBeNull();
  });
});
