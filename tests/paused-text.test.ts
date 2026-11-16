import { expect, it } from "vitest";
import { renderAt } from "../src/render/renderFrame";
import type { Frame, Project } from "../src/lib/stillframe/types";

const headline = "Celebrate with Something Special";
const subline = "Wines for milestone moments";
const frames = [{
  id: "f", duration_sec: 3, photo: {},
  headline: { text: headline, animation: "typewriter", size_px: 52 },
  subline: { text: subline, animation: "typewriter", size_px: 24 },
}] as Frame[];
const project = { logo: { enabled: false }, end_card: {} } as Project;

function drawn(completeText = false, delayed = false) {
  const texts: string[] = [];
  const ctx = {
    save() {}, restore() {}, setTransform() {}, fillRect() {},
    measureText: (text: string) => ({ width: text.length * 10 }),
    fillText: (text: string) => texts.push(text),
  } as unknown as CanvasRenderingContext2D;
  const input = delayed ? frames.map(f => ({ ...f, headline: { ...f.headline, delay_sec: 2 } })) : frames;
  renderAt(ctx, project, input, "9:16", 0.6, { width: 1080, height: 1920, completeText });
  return texts;
}

it("shows every headline and subline character when editing a paused typewriter frame", () => {
  expect(drawn(true)).toEqual([headline, subline]);
});
it("keeps the typewriter reveal unchanged for playback and export", () => {
  expect(drawn()).toEqual([headline.slice(0, 28), subline.slice(0, 8)]);
});
it("shows delayed text while editing without waiting for its playback delay", () => {
  expect(drawn(true, true)).toEqual([headline, subline]);
  expect(drawn(false, true)).toEqual([]);
});