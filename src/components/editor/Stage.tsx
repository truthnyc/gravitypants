import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { EditorDoc } from "@/lib/stillframe/data";
import type { Format, LogoPosition, TextSettings } from "@/lib/stillframe/types";
import { FORMAT_SIZE, type Rect } from "@/render/formats";
import {
  ANCHORS,
  anchorPoint,
  fontFamilyOf,
  layoutFrame,
  renderAt,
  type Anchor,
  type Box,
  type FrameLayout,
} from "@/render/renderFrame";
import { ELEMENT_META, type ElementKey } from "./use-editor";
import { cn } from "@/lib/utils";

type DragEl = "headline" | "subline" | "logo";

export function Stage({
  doc,
  frameIndex,
  format,
  time,
  playing,
  selected,
  images,
  version,
  onSelect,
  onMove,
  onText,
  adjusting = false,
  sizeOf,
  onResize,
  onFocus,
  onAdjustDone,
}: {
  doc: EditorDoc;
  frameIndex: number;
  format: Format;
  time: number;
  playing: boolean;
  selected: ElementKey;
  images: Map<string, HTMLImageElement>;
  version: number;
  onSelect: (el: ElementKey) => void;
  onMove: (el: DragEl, anchor: Anchor) => void;
  onText: (el: "headline" | "subline", text: string) => void;
  adjusting?: boolean;
  sizeOf: (el: DragEl) => number;
  onResize: (el: DragEl, value: number, key: string) => void;
  onFocus: (patch: { focus?: { x: number; y: number }; zoom?: number }, key: string) => void;
  onAdjustDone: () => void;
}) {
  const [resize, setResize] = useState<{ el: DragEl; x: number; w: number; v: number; id: number } | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number; fx: number; fy: number; id: number } | null>(null);
  const sessions = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [layout, setLayout] = useState<FrameLayout | null>(null);
  const [drag, setDrag] = useState<{ el: DragEl; x: number; y: number; moving: boolean; anchor: Anchor | null } | null>(null);
  const [editing, setEditing] = useState<"headline" | "subline" | null>(null);

  const size = FORMAT_SIZE[format];
  const ratio = size.width / size.height;
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const w = Math.min(width, height * ratio);
      setBox({ w: Math.floor(w), h: Math.floor(w / ratio) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  const W = Math.round(box.w * dpr);
  const H = Math.round(box.h * dpr);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !W || !H) return;
    renderAt(ctx, doc.project, doc.frames, format, time, { width: W, height: H, images, showGuides: !playing && Boolean(drag?.moving) });
    if (!playing) setLayout(layoutFrame(ctx, doc.project, doc.frames, frameIndex, format, W, H, images));
  }, [doc, format, time, W, H, images, version, playing, frameIndex, drag?.moving]);

  const toCss = (b: Box) => ({ left: b.x / dpr, top: b.y / dpr, width: b.w / dpr, height: b.h / dpr });

  const nearest = (clientX: number, clientY: number, el: DragEl, safe: Rect): Anchor => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    const choices = el === "logo" ? ANCHORS.filter((a) => !a.startsWith("middle") && a !== "center") : ANCHORS;
    let best: Anchor = "center";
    let bestD = Infinity;
    for (const a of choices) {
      const p = anchorPoint(a, safe);
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  };

  const down = (el: DragEl) => (e: RPointerEvent) => {
    e.stopPropagation();
    onSelect(el);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ el, x: e.clientX, y: e.clientY, moving: false, anchor: null });
  };
  const move = (e: RPointerEvent) => {
    if (!drag || !layout) return;
    const moving = drag.moving || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4;
    if (!moving) return;
    setDrag({ ...drag, moving, anchor: nearest(e.clientX, e.clientY, drag.el, layout.safe) });
  };
  const up = () => {
    if (drag?.moving && drag.anchor) onMove(drag.el, drag.anchor);
    setDrag(null);
  };

  const frame = doc.frames[frameIndex];
  const showTags = !playing && !adjusting && layout;

  const tag = (el: ElementKey, b: Box | null, draggable: boolean, text?: TextSettings | null) => {
    if (!b) return null;
    const meta = ELEMENT_META[el];
    const active = selected === el;
    const css = toCss(b);
    const pad = 4;
    return (
      <div
        key={el}
        className={cn("absolute", draggable && "cursor-grab", drag?.el === el && drag.moving && "cursor-grabbing")}
        style={{
          left: css.left - pad,
          top: css.top - pad,
          width: css.width + pad * 2,
          height: css.height + pad * 2,
          outline: `2px ${active ? "solid" : "dashed"} ${meta.color}`,
          outlineOffset: 0,
          borderRadius: 4,
          opacity: active ? 1 : 0.85,
        }}
        onPointerDown={draggable ? down(el as DragEl) : undefined}
        onPointerMove={move}
        onPointerUp={up}
        onDoubleClick={() => (el === "headline" || el === "subline") && setEditing(el)}
      >
        <Tag el={el} active={active} className="absolute -top-[22px] left-[-2px]" />
        {active && draggable && !editing && (
          <span
            role="presentation"
            aria-hidden
            className="absolute -bottom-[5px] -right-[5px] size-2.5 cursor-nwse-resize rounded-[2px] border-2 bg-card"
            style={{ borderColor: meta.color }}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setResize({ el: el as DragEl, x: e.clientX, w: Math.max(20, css.width), v: sizeOf(el as DragEl), id: ++sessions.current });
            }}
            onPointerMove={(e) => {
              if (!resize) return;
              e.stopPropagation();
              const ratio = Math.max(0.1, (resize.w + (e.clientX - resize.x)) / resize.w);
              onResize(resize.el, resize.v * ratio, `drag:resize-${resize.el}:${resize.id}`);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setResize(null);
            }}
          />
        )}
        {editing === el && text && (
          <textarea
            autoFocus
            defaultValue={text.text}
            aria-label={`${meta.label} text`}
            className="absolute inset-0 resize-none rounded-sm bg-foreground/50 p-1 text-center leading-tight text-background outline-none"
            style={{ fontFamily: `"${fontFamilyOf(text)}"`, fontWeight: text.font_weight ?? 700, fontSize: Math.max(12, (layoutFont(layout, el) / dpr) * 0.9) }}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              onText(el as "headline" | "subline", e.currentTarget.value);
              setEditing(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === "Escape") setEditing(null);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div ref={wrapRef} className="flex h-full w-full items-center justify-center">
      <div
        className="relative rounded-sm shadow-card"
        style={{ width: box.w, height: box.h, outline: selected === "photo" && showTags ? `2px solid ${ELEMENT_META.photo.color}` : undefined, outlineOffset: 3 }}
        onPointerDown={() => onSelect("photo")}
      >
        <canvas ref={canvasRef} width={W || 1} height={H || 1} className="block h-full w-full rounded-sm" aria-label="Ad preview" role="img" />
        {showTags && frame && (
          <>
            <button
              type="button"
              className="absolute left-2 top-2"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect("photo");
              }}
            >
              <Tag el="photo" active={selected === "photo"} />
            </button>
            {tag("headline", layout.headline, true, frame.headline)}
            {tag("subline", layout.subline, true, frame.subline)}
            {tag("logo", layout.logo, true)}
          </>
        )}
        {adjusting && frame && (
          <div
            className="absolute inset-0 cursor-move rounded-sm ring-2 ring-el-photo"
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              const f = frame.photo?.focus ?? { x: 0.5, y: 0.5 };
              setPan({ x: e.clientX, y: e.clientY, fx: f.x, fy: f.y, id: ++sessions.current });
            }}
            onPointerMove={(e) => {
              if (!pan) return;
              const z = frame.photo?.zoom ?? 1;
              const x = Math.min(1, Math.max(0, pan.fx - (e.clientX - pan.x) / (box.w * z * 1.4)));
              const y = Math.min(1, Math.max(0, pan.fy - (e.clientY - pan.y) / (box.h * z * 1.4)));
              onFocus({ focus: { x, y } }, `drag:focus:${pan.id}`);
            }}
            onPointerUp={() => setPan(null)}
            onWheel={(e) => {
              const z = frame.photo?.zoom ?? 1;
              onFocus({ zoom: Math.min(3, Math.max(1, z - e.deltaY * 0.002)) }, "zoom-wheel");
            }}
          >
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="border border-background/30" />
              ))}
            </div>
            <div
              className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-lg bg-card/95 px-3 py-2 shadow-popover"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="text-[12px] font-medium">Zoom</span>
              <input
                type="range"
                min={100}
                max={300}
                value={Math.round((frame.photo?.zoom ?? 1) * 100)}
                onChange={(e) => onFocus({ zoom: Number(e.target.value) / 100 }, "zoom-range")}
                aria-label="Zoom"
                className="flex-1 accent-[var(--el-photo)]"
              />
              <button type="button" onClick={onAdjustDone} className="text-[13px] font-semibold text-link">
                Done
              </button>
            </div>
            <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-foreground/70 px-2.5 py-1 text-[12px] text-background">
              Drag to choose what stays in view
            </span>
          </div>
        )}
        {drag?.moving && layout && (
          <div className="pointer-events-none absolute inset-0">
            {(drag.el === "logo" ? ANCHORS.filter((a) => !a.startsWith("middle") && a !== "center") : ANCHORS).map((a) => {
              const p = anchorPoint(a, layout.safe);
              return (
                <span
                  key={a}
                  className={cn("absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background", drag.anchor === a ? "opacity-100 ring-2 ring-primary" : "opacity-50")}
                  style={{ left: p.x / dpr, top: p.y / dpr }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function layoutFont(layout: FrameLayout | null, el: ElementKey) {
  if (el === "headline") return layout?.headline?.fontPx ?? 24;
  if (el === "subline") return layout?.subline?.fontPx ?? 16;
  return 16;
}

export function Tag({ el, active, className }: { el: ElementKey; active: boolean; className?: string }) {
  const meta = ELEMENT_META[el];
  return (
    <span
      className={cn("inline-flex h-5 items-center whitespace-nowrap rounded-sm px-1.5 text-[11px] font-semibold shadow-segment", className)}
      style={active ? { background: meta.color, color: "var(--on-accent)" } : { background: "var(--card)", color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

export type { LogoPosition };
