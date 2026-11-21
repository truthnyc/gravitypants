import type { GifColors } from "@/render/exportMedia";
export type GifSize = "full" | "half" | "small";
export type GifQuality = { size: GifSize; colors: GifColors; fps: number };
export const DEFAULT_EXPORT_FORMATS = { mp4: true, gif: false };
export const DEFAULT_VIDEO_FPS = 24;
export const DEFAULT_GIF_LOOP = "forever";

/** Segmented-control options. Every default below must appear in its own list so the control shows a selection. */
export const VIDEO_FPS_OPTIONS: { v: number; l: string; s?: string }[] = [
  { v: 24, l: "Film", s: "24 fps" },
  { v: 30, l: "Standard", s: "30 fps" },
  { v: 60, l: "Smooth", s: "60 fps" },
];
export const GIF_SIZE_OPTIONS: { v: GifSize; l: string; s?: string }[] = [
  { v: "full", l: "Full" },
  { v: "half", l: "Half" },
  { v: "small", l: "Small", s: "480px" },
];
export const GIF_COLOR_OPTIONS: { v: GifColors; l: string }[] = [
  { v: "best", l: "Best" },
  { v: "balanced", l: "Balanced" },
  { v: "smallest", l: "Smallest" },
];
export const GIF_FPS_OPTIONS: { v: number; l: string; s?: string }[] = [
  { v: 25, l: "High", s: "25 fps" },
  { v: 15, l: "Medium", s: "15 fps" },
  { v: 12, l: "Low", s: "12 fps" },
  { v: 10, l: "Minimum", s: "10 fps" },
];
export const GIF_PRESETS = [
  { id: "small", label: "Small file", subtitle: "Email, chat", size: "small", colors: "smallest", fps: 10 },
  { id: "balanced", label: "Balanced", subtitle: "Most uses", size: "half", colors: "balanced", fps: 15 },
  { id: "best", label: "Best", subtitle: "Sharpest, biggest", size: "full", colors: "best", fps: 25 },
] as const;
export type GifPresetId = (typeof GIF_PRESETS)[number]["id"];
export const DEFAULT_GIF_QUALITY: GifQuality = { size: "small", colors: "best", fps: 12 };
export function matchingGifPreset(quality: GifQuality): GifPresetId | null {
  return GIF_PRESETS.find((p) => p.size === quality.size && p.colors === quality.colors && p.fps === quality.fps)?.id ?? null;
}
export function exportSelectionCount(sizeCount: number, formatCount: number) {
  return sizeCount * formatCount;
}

/** Approximate encoded bytes, not a guarantee: photo detail and encoder fallback affect the final size. */
export function estimateExportBytes(kind: "mp4" | "gif" | "html5", width: number, height: number, seconds: number, fps: number, colors: GifColors = "balanced") {
  if (kind === "html5") return Math.round(60_000 + width * height * 0.35);
  if (kind === "mp4") return Math.round(seconds * (fps >= 60 ? 10_000_000 : 6_000_000) / 8);
  const bytesPerPixel = colors === "best" ? 0.22 : colors === "smallest" ? 0.12 : 0.16;
  return Math.round(width * height * seconds * fps * bytesPerPixel);
}
