/**
 * Browser-side export. Every output frame is drawn by the same renderAt() used by the
 * preview, on an OffscreenCanvas at the exact output size.
 */
import type { Format, Frame, Project } from "@/lib/stillframe/types";
import { renderAt, videoDuration, type BrandStyle } from "./renderFrame";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

export type GifColors = "best" | "balanced" | "smallest";
export type GifOptions = { fps: number; colors: GifColors; loop: "forever" | "once" };

export type RenderInput = {
  project: Project;
  frames: Frame[];
  brand: BrandStyle;
  images: Map<string, HTMLImageElement>;
  format: Format;
  width: number;
  height: number;
  /** Free-trial exports carry a small mark. */
  watermark?: boolean;
};

type Progress = (p: number) => void;

export class ExportCancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

/** Yields to the event loop via MessageChannel — not throttled like timers/rAF in hidden tabs. */
const channel = typeof MessageChannel !== "undefined" ? new MessageChannel() : null;
const waiting: (() => void)[] = [];
if (channel) channel.port1.onmessage = () => waiting.shift()?.();
const tick = () =>
  new Promise<void>((r) => {
    if (!channel) return r();
    waiting.push(r);
    channel.port2.postMessage(0);
  });

function makeCanvas(w: number, h: number) {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as unknown as CanvasRenderingContext2D;
  return { canvas, ctx };
}

function draw(ctx: CanvasRenderingContext2D, input: RenderInput, t: number) {
  renderAt(ctx, input.project, input.frames, input.format, t, {
    width: input.width,
    height: input.height,
    images: input.images,
    brand: input.brand,
    watermark: input.watermark ?? false,
  });
}

function frameCount(input: RenderInput, fps: number) {
  return Math.max(1, Math.round(videoDuration(input.project, input.frames, input.brand) * fps));
}

/* ------------------------------------------------------------------ ffmpeg.wasm (lazy) */

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ff = new FFmpeg();
      const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })();
    ffmpegPromise.catch(() => (ffmpegPromise = null));
  }
  return ffmpegPromise;
}

/** Stops any running ffmpeg job (a fresh instance loads next time). */
export function killFFmpeg() {
  const p = ffmpegPromise;
  ffmpegPromise = null;
  void p?.then((ff) => ff.terminate()).catch(() => undefined);
}

async function writePngFrames(ff: FFmpeg, input: RenderInput, fps: number, signal: AbortSignal, onProgress: Progress, share: number) {
  const { canvas, ctx } = makeCanvas(input.width, input.height);
  const n = frameCount(input, fps);
  for (let i = 0; i < n; i++) {
    if (signal.aborted) throw new ExportCancelled();
    draw(ctx, input, i / fps);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    await ff.writeFile(`f${String(i).padStart(5, "0")}.png`, new Uint8Array(await blob.arrayBuffer()));
    onProgress(((i + 1) / n) * share);
    if (i % 4 === 0) await tick();
  }
  return n;
}

async function cleanup(ff: FFmpeg, n: number, extra: string[]) {
  for (let i = 0; i < n; i++) await ff.deleteFile(`f${String(i).padStart(5, "0")}.png`).catch(() => undefined);
  for (const f of extra) await ff.deleteFile(f).catch(() => undefined);
}

async function run(ff: FFmpeg, args: string[], signal: AbortSignal, onProgress: Progress, from: number, to: number) {
  const handler = ({ progress }: { progress: number }) => onProgress(from + Math.min(1, Math.max(0, progress)) * (to - from));
  ff.on("progress", handler);
  try {
    const code = await ff.exec(args);
    if (signal.aborted) throw new ExportCancelled();
    if (code !== 0) throw new Error(`Encoding failed (${code})`);
  } finally {
    ff.off("progress", handler);
  }
}

/* ------------------------------------------------------------------ MP4 */

export async function exportMp4(input: RenderInput, fps: number, signal: AbortSignal, onProgress: Progress): Promise<Blob> {
  const mb = await import("mediabunny");
  // Phones (iPhone Safari especially) can claim support yet fail at high bitrates, so step down before falling back.
  const rates = fps >= 60 ? [20_000_000, 8_000_000, 4_000_000] : [12_000_000, 6_000_000, 3_000_000];
  for (const bitrate of rates) {
    if (typeof VideoEncoder === "undefined") break;
    const ok = await mb.canEncodeVideo("avc", { width: input.width, height: input.height, bitrate }).catch(() => false);
    if (!ok) continue;
    let output: InstanceType<typeof mb.Output> | null = null;
    try {
      const { canvas, ctx } = makeCanvas(input.width, input.height);
      output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
      const source = new mb.CanvasSource(canvas, { codec: "avc", bitrate, keyFrameInterval: 2 });
      output.addVideoTrack(source, { frameRate: fps });
      await output.start();
      const n = frameCount(input, fps);
      for (let i = 0; i < n; i++) {
        if (signal.aborted) throw new ExportCancelled();
        draw(ctx, input, i / fps);
        await source.add(i / fps, 1 / fps);
        onProgress((i + 1) / n);
        if (i % 6 === 0) await tick();
      }
      await output.finalize();
      const buf = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
      if (!buf || buf.byteLength === 0) throw new Error("Empty video");
      return new Blob([buf], { type: "video/mp4" });
    } catch (e) {
      await output?.cancel().catch(() => undefined);
      if (e instanceof ExportCancelled || signal.aborted) throw new ExportCancelled();
      console.warn(`Video encoder failed at ${bitrate}bps, trying next option`, e);
      onProgress(0);
    }
  }

  // Fallback: ffmpeg.wasm with libx264
  const ff = await getFFmpeg();
  const n = await writePngFrames(ff, input, fps, signal, onProgress, 0.5);
  try {
    await run(
      ff,
      ["-framerate", String(fps), "-i", "f%05d.png", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "out.mp4"],
      signal,
      onProgress,
      0.5,
      1,
    );
    const data = (await ff.readFile("out.mp4")) as Uint8Array;
    return new Blob([new Uint8Array(data)], { type: "video/mp4" });
  } finally {
    await cleanup(ff, n, ["out.mp4"]);
  }
}

/* ------------------------------------------------------------------ GIF */

export async function exportGif(input: RenderInput, opts: GifOptions, signal: AbortSignal, onProgress: Progress): Promise<Blob> {
  const ff = await getFFmpeg();
  const n = await writePngFrames(ff, input, opts.fps, signal, onProgress, 0.6);
  const maxColors = opts.colors === "smallest" ? 128 : 256;
  const dither = opts.colors === "best" ? "dither=sierra2_4a:diff_mode=rectangle" : "dither=bayer:bayer_scale=3:diff_mode=rectangle";
  try {
    await run(ff, ["-framerate", String(opts.fps), "-i", "f%05d.png", "-vf", `palettegen=stats_mode=diff:max_colors=${maxColors}`, "-y", "palette.png"], signal, onProgress, 0.6, 0.7);
    await run(
      ff,
      ["-framerate", String(opts.fps), "-i", "f%05d.png", "-i", "palette.png", "-lavfi", `[0:v][1:v]paletteuse=${dither}`, "-loop", opts.loop === "once" ? "-1" : "0", "-y", "out.gif"],
      signal,
      onProgress,
      0.7,
      1,
    );
    const data = (await ff.readFile("out.gif")) as Uint8Array;
    return new Blob([new Uint8Array(data)], { type: "image/gif" });
  } finally {
    await cleanup(ff, n, ["palette.png", "out.gif"]);
  }
}

export function isOutOfMemory(e: unknown) {
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return e instanceof RangeError || msg.includes("memory") || msg.includes("oom") || msg.includes("allocation");
}
