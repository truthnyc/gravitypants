import { expect, it } from "vitest";
import { transitionDuration } from "../src/render/renderFrame";
it("uses 750ms for Smooth transitions", () => { expect(transitionDuration({ type: "fade", speed: "smooth" })).toBe(0.75); });
it("uses 350ms for Quick transitions", () => { expect(transitionDuration({ type: "slide", speed: "quick" })).toBe(0.35); });
it("keeps cuts instantaneous", () => { expect(transitionDuration({ type: "cut", speed: "smooth" })).toBe(0); });