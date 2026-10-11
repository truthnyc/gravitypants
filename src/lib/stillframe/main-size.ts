import type { EditorDoc } from "./data";
import { DEFAULT_LOGO, type Format, type TextSettings } from "./types";
import { ANCHORS } from "@/render/renderFrame";

/** The five ad sizes, with the same names on every step. Order is the order users see. */
export const MAIN_SIZES: { format: Format; name: string; width: number; height: number }[] = [
  { format: "9:16", name: "Vertical", width: 1080, height: 1920 },
  { format: "4:5", name: "Portrait", width: 1080, height: 1350 },
  { format: "1:1", name: "Square", width: 1080, height: 1080 },
  { format: "16:9", name: "Landscape", width: 1920, height: 1080 },
  { format: "5:4", name: "Wide", width: 1350, height: 1080 },
];

export const sizeOf = (f: Format) => MAIN_SIZES.find((s) => s.format === f) ?? MAIN_SIZES[1]!;
/** "Portrait 4:5" */
export const sizeLabel = (f: Format) => `${sizeOf(f).name} ${f}`;
/** "1080 × 1350" */
export const sizePixels = (f: Format) => `${sizeOf(f).width} × ${sizeOf(f).height}`;
/** Export size id for a format ("4:5" -> "4x5"). */
export const sizeIdOf = (f: Format) => f.replace(":", "x") as "9x16" | "4x5" | "1x1" | "16x9" | "5x4";

function snap<T extends Partial<TextSettings> | null | undefined>(t: T): T {
  if (!t || t.position === undefined) return t;
  return (ANCHORS as string[]).includes(t.position) ? t : { ...t, position: "center" };
}

/**
 * Makes `format` the ad's main size: photo crops re-center for that size, text is kept and snapped
 * to the nearest anchor, the logo moves to the brand kit default for that size. Layout itself
 * re-flows in the renderer. Export sizes always include the main size.
 */
export function refitForMainSize(doc: EditorDoc, format: Format, kitPositions?: Partial<Record<Format, string>> | null): EditorDoc {
  const p = doc.project;
  const logoPos = kitPositions?.[format] ?? DEFAULT_LOGO.positions?.[format] ?? "top-right";
  return {
    project: {
      ...p,
      primary_format: format,
      formats: p.formats.includes(format) ? p.formats : [...p.formats, format],
      logo: { ...p.logo, positions: { ...p.logo.positions, [format]: logoPos } },
    },
    frames: doc.frames.map((fr) => {
      const own = fr.format_overrides?.[format] ?? {};
      return {
        ...fr,
        headline: snap(fr.headline),
        subline: snap(fr.subline),
        format_overrides: {
          ...fr.format_overrides,
          [format]: {
            ...own,
            photo: { ...own.photo, focus: { x: 0.5, y: 0.5 } },
            ...(own.headline !== undefined ? { headline: snap(own.headline) } : {}),
            ...(own.subline !== undefined ? { subline: snap(own.subline) } : {}),
          },
        },
      };
    }),
  };
}
