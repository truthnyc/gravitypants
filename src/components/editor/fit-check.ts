import type { EditorDoc } from "@/lib/stillframe/data";
import type { Format } from "@/lib/stillframe/types";
import { FORMAT_SIZE } from "@/render/formats";
import { layoutFrame } from "@/render/renderFrame";

export type FitBox = { x: number; y: number; w: number; h: number };
export type FitIssue = { format: Format; frame: number; text: string };
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

const FORMATS: Format[] = ["9:16", "1:1", "16:9"];

/** Lays every frame out off-screen at each size with the same layout code the preview uses. */
export function checkFit(doc: EditorDoc, images: Map<string, HTMLImageElement>): FitIssue[] {
  if (typeof document === "undefined") return [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const issues: FitIssue[] = [];
  for (const format of FORMATS) {
    const { width, height } = FORMAT_SIZE[format];
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
        issues.push({ format, frame: i, text });
      }
    });
  }
  return issues;
}
