import type { Format } from "@/lib/stillframe/types";

export const FORMAT_SIZE: Record<Format, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export const ALL_FORMATS: Format[] = ["9:16", "1:1", "16:9"];

/** Safe-area insets as fractions (top/bottom of height, sides of width). */
export const SAFE_AREA: Record<Format, { top: number; bottom: number; side: number }> = {
  "9:16": { top: 0.1, bottom: 0.18, side: 0.06 },
  "4:5": { top: 0.06, bottom: 0.06, side: 0.06 },
  "1:1": { top: 0.06, bottom: 0.06, side: 0.06 },
  "16:9": { top: 0.05, bottom: 0.05, side: 0.05 },
};

export type Rect = { x: number; y: number; w: number; h: number };

export function safeRect(format: Format, width: number, height: number): Rect {
  const s = SAFE_AREA[format];
  const x = width * s.side;
  const y = height * s.top;
  return { x, y, w: width - 2 * x, h: height - y - height * s.bottom };
}
