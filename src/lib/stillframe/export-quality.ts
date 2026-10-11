import type { GifColors } from "@/render/exportMedia";
export type GifSize = "full" | "half" | "small";
export type GifQuality = { size: GifSize; colors: GifColors; fps: number };
export const DEFAULT_EXPORT_FORMATS = { mp4: true, gif: false };
export const DEFAULT_VIDEO_FPS = 30;
export const DEFAULT_GIF_LOOP = "forever";
export const GIF_PRESETS = [
  { id: "small", label: "Small file", subtitle: "Email, chat", size: "small", colors: "smallest", fps: 10 },
  { id: "balanced", label: "Balanced", subtitle: "Most uses", size: "half", colors: "balanced", fps: 15 },
  { id: "best", label: "Best", subtitle: "Sharpest, biggest", size: "full", colors: "best", fps: 25 },
] as const;
export type GifPresetId = (typeof GIF_PRESETS)[number]["id"];
export const DEFAULT_GIF_QUALITY: GifQuality = { size: "half", colors: "balanced", fps: 15 };
export function matchingGifPreset(quality: GifQuality): GifPresetId | null {
  return GIF_PRESETS.find((p) => p.size === quality.size && p.colors === quality.colors && p.fps === quality.fps)?.id ?? null;
}
export function exportSelectionCount(sizeCount: number, formatCount: number) {
  return sizeCount * formatCount;
}
