import { useRef } from "react";
import { Pause, Play } from "lucide-react";
import type { Frame } from "@/lib/stillframe/types";
import { frameStarts, totalDuration } from "@/render/renderFrame";
import { TransitionChip } from "./FrameRail";
import { cn } from "@/lib/utils";

export function fmtTime(t: number, withTenths = true) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  if (!withTenths && Math.abs(s - Math.round(s)) < 0.05) return `${m}:${String(Math.round(s)).padStart(2, "0")}`;
  const whole = Math.floor(s);
  const tenth = Math.floor((s - whole) * 10);
  return `${m}:${String(whole).padStart(2, "0")}.${tenth}`;
}

export function Timeline({
  frames,
  endSeconds = 0,
  frameIndex,
  time,
  playing,
  onTogglePlay,
  onSeek,
  onSelectFrame,
  onDuration,
}: {
  frames: Frame[];
  endSeconds?: number;
  frameIndex: number;
  time: number;
  playing: boolean;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onSelectFrame: (i: number) => void;
  onDuration: (i: number, seconds: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const total = totalDuration(frames) + (frames.length ? endSeconds : 0);
  const starts = frameStarts(frames);

  const seekFrom = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || !total) return;
    onSeek(Math.min(total, Math.max(0, ((clientX - r.left) / r.width) * total)));
  };

  const startResize = (i: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const pps = r.width / total;
    const startX = e.clientX;
    const startDur = frames[i]?.duration_sec ?? 2.5;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const next = Math.max(0.5, Math.round((startDur + (ev.clientX - startX) / pps) * 10) / 10);
      onDuration(i, next);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  return (
    <footer className="hidden h-[92px] shrink-0 items-center gap-4 bg-card px-5 hairline-t lg:flex">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        {playing ? <Pause className="size-5" strokeWidth={1.7} fill="currentColor" /> : <Play className="ml-0.5 size-5" strokeWidth={1.7} fill="currentColor" />}
      </button>
      <div className="w-[104px] shrink-0 text-[13px] nums">
        <span className="font-semibold">{fmtTime(time)}</span>
        <span className="text-secondary-text"> / {fmtTime(total, false)}</span>
      </div>
      <div
        ref={trackRef}
        className="relative flex h-12 flex-1 cursor-pointer items-stretch gap-0"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          seekFrom(e.clientX);
        }}
        onPointerMove={(e) => e.buttons === 1 && seekFrom(e.clientX)}
      >
        {frames.map((f, i) => (
          <div key={f.id} className="relative flex min-w-0 items-stretch" style={{ flexGrow: f.duration_sec, flexBasis: 0 }}>
            {i > 0 && (
              <div className="absolute -left-px top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <TransitionChip frame={f} compact />
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelectFrame(i)}
              className={cn(
                "mx-[2px] flex flex-1 items-end overflow-hidden rounded-sm bg-control-fill px-2 pb-1 text-left text-[11px] text-secondary-text nums",
                i === frameIndex && "ring-2 ring-primary",
              )}
            >
              <span className="truncate">
                {i + 1} · {f.duration_sec.toFixed(1)}s
              </span>
            </button>
            {i === frameIndex && (
              <span
                role="slider"
                aria-label="Frame length"
                aria-valuenow={f.duration_sec}
                className="absolute -right-1 top-1/2 z-20 h-8 w-2 -translate-y-1/2 cursor-ew-resize rounded-full bg-primary"
                onPointerDown={startResize(i)}
              />
            )}
          </div>
        ))}
        {endSeconds > 0 && frames.length > 0 && (
          <div className="relative flex min-w-0 items-stretch" style={{ flexGrow: endSeconds, flexBasis: 0 }}>
            <div className="mx-[2px] flex flex-1 items-end overflow-hidden rounded-sm bg-control-fill/60 px-2 pb-1 text-[11px] text-secondary-text nums">
              <span className="truncate">End card · {endSeconds.toFixed(1)}s</span>
            </div>
          </div>
        )}
        {total > 0 && (
          <div
            className="pointer-events-none absolute -bottom-1 -top-1 z-30 w-0.5 rounded-full bg-primary"
            style={{ left: `${(time / total) * 100}%` }}
          >
            <span className="absolute -left-[5px] -top-1 size-3 rounded-full bg-primary" />
          </div>
        )}
      </div>
      <span className="sr-only">{starts.length} frames</span>
    </footer>
  );
}
