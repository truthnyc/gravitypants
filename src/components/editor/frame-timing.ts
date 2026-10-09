import { PACE_SECONDS, type Frame, type Pace } from "@/lib/stillframe/types";

export const FRAME_MIN_SECONDS = 1;
export const FRAME_MAX_SECONDS = 8;
export function clampFrameSeconds(seconds: number) {
  return Math.max(FRAME_MIN_SECONDS, Math.min(FRAME_MAX_SECONDS, Math.round(seconds * 2) / 2));
}
export function changeFrameLength(frames: Frame[], index: number, seconds: number, all: boolean) {
  const duration_sec = clampFrameSeconds(seconds);
  return frames.map((frame, i) => all || i === index ? { ...frame, duration_sec } : frame);
}
export function matchingPace(frames: Frame[]): Pace | undefined {
  return frames.length ? (Object.keys(PACE_SECONDS) as Pace[]).find((pace) => frames.every((frame) => frame.duration_sec === PACE_SECONDS[pace])) : undefined;
}