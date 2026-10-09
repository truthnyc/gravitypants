import { afterEach, describe, expect, it, vi } from "vitest";
import { FontLoadError, loadFont } from "../src/lib/stillframe/fonts";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function mockFonts(faces: unknown[]) {
  vi.stubGlobal("document", {
    createElement: () => ({ addEventListener: vi.fn() }),
    head: { appendChild: vi.fn() },
    fonts: { load: vi.fn().mockResolvedValue(faces) },
  });
}
describe("export font loading", () => {
  it("stops export instead of silently using an unavailable font", async () => {
    vi.useFakeTimers();
    mockFonts([]);
    const promise = loadFont("Unavailable Test Font", 700, { strict: true });
    const failure = expect(promise).rejects.toBeInstanceOf(FontLoadError);
    await vi.runAllTimersAsync();
    await failure;
  });
  it("accepts a font when its face has loaded", async () => {
    mockFonts([{ status: "loaded" }]);
    await expect(loadFont("Available Test Font", 400, { strict: true })).resolves.toBeUndefined();
    expect(document.fonts.load).toHaveBeenCalledWith('400 48px "Available Test Font"', undefined);
  });
});
