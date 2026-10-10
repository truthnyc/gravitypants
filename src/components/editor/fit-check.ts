import type { EditorDoc } from "@/lib/stillframe/data";
import type { Format } from "@/lib/stillframe/types";
import { FORMAT_SIZE } from "@/render/formats";
import { layoutFrame } from "@/render/renderFrame";

export type FitBox = { x: number; y: number; w: number; h: number };
/** `format` is the preview shape label (includes "4:5", which lays out with the 1:1 rules). */
export type FitIssue = { format: string; frame: number; text: string };
type El = "headline" | "subline" | "logo";

/** Pure check: elements outside the frame or overlapping (with breathing room as a fraction of the shorter side). */
export function findProblems(boxes: Partial<Record<El, FitBox | null>>, W: number, H: number, room = 0.03): string[] {
  const out: string[] = [];
  const els = (["headline", "subline", "logo"] as El[]).filter((e) => boxes[e]);
  for (const e of els) {
    const b = boxes[e]!;
    if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > W + 0.5 || b.y + b.h > H + 0.5) out.push(`the ${e} is cut off`);
  }
  const pad = (Math.min(W, H) * room) / 2;
  for (let i = 0; i < els.length; i++)
    for (let j = i + 1; j < els.length; j++) {
      const a = boxes[els[i]!]!;
      const b = boxes[els[j]!]!;
      const hit = a.x - pad < b.x + b.w + pad && b.x - pad < a.x + a.w + pad && a.y - pad < b.y + b.h + pad && b.y - pad < a.y + a.h + pad;
      if (hit) out.push(`the ${els[i]} overlaps the ${els[j]}`);
    }
  return out;
}

const SHAPES: { shape: string; layout: Format; width: number; height: number }[] = [
  { shape: "9:16", layout: "9:16", ...FORMAT_SIZE["9:16"] },
  { shape: "4:5", layout: "1:1", width: 1080, height: 1350 },
  { shape: "1:1", layout: "1:1", ...FORMAT_SIZE["1:1"] },
  { shape: "16:9", layout: "16:9", ...FORMAT_SIZE["16:9"] },
];

/** Lays every frame out off-screen at each size with the same layout code the preview uses. */
export function checkFit(doc: EditorDoc, images: Map<string, HTMLImageElement>): FitIssue[] {
  if (typeof document === "undefined") return [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const issues: FitIssue[] = [];
  for (const { shape, layout: format, width, height } of SHAPES) {
    const W = width / 2;
    const H = height / 2;
    canvas.width = W;
    canvas.height = H;
    doc.frames.forEach((f, i) => {
      const l = layoutFrame(ctx, doc.project, doc.frames, i, format, W, H, images);
      // A subline kept under the headline lives in the same block, so it never "overlaps" it.
      const under = f.subline?.keep_under_headline ?? true;
      const boxes = { headline: l.headline, subline: l.subline, logo: l.logo };
      for (const text of findProblems(boxes, W, H)) {
        if (under && text === "the headline overlaps the subline") continue;
        issues.push({ format: shape, frame: i, text });
      }
    });
  }
  return issues;
}
