import { clampOffset, clampScale, photoOffset, photoScale, SCALE_MAX, SCALE_MIN } from "@/lib/stillframe/framing";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import type { EditorDoc } from "@/lib/stillframe/data";
import type { Format, Frame, LogoPosition, TextSettings } from "@/lib/stillframe/types";
import { FORMAT_SIZE, type Rect } from "@/render/formats";
import {
  ANCHORS,
  anchorPoint,
  fontFamilyOf,
  layoutFrame,
  renderAt,
  type Anchor,
  type BrandStyle,
  type Box,
  type FrameLayout,
} from "@/render/renderFrame";
import { ELEMENT_META, type ElementKey } from "./use-editor";
import { cn } from "@/lib/utils";
import { frameForFormat } from "@/lib/stillframe/format-settings";

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
  adjustHint,
  overlay,
  interactive = true,
  brand,
  aspect,
}: {
  /** Drawn over the preview, ignores pointer input (e.g. safe zones). */
  overlay?: ReactNode;
  /** Override the canvas shape (e.g. 4:5) while laying out with `format`'s rules. */
  aspect?: number | undefined;
  brand?: BrandStyle;
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
  onFocus: (patch: { offset?: { x: number; y: number }; scale?: number }, key: string) => void;
  onAdjustDone: () => void;
  adjustHint?: string | undefined;
  interactive?: boolean;
}) {
  const [resize, setResize] = useState<{ el: DragEl; x: number; w: number; v: number; id: number } | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number; fx: number; fy: number; id: number } | null>(null);
  const sessions = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [layout, setLayout] = useState<FrameLayout | null>(null);
  const [drag, setDrag] = useState<{ el: DragEl; x: number; y: number; moving: boolean; anchor: Anchor | null; was: boolean } | null>(null);
  const [editing, setEditing] = useState<"headline" | "subline" | null>(null);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const size = FORMAT_SIZE[format];
  const ratio = aspect ?? size.width / size.height;
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
    const frames = reduced ? calmFrames(doc.frames) : doc.frames;
    renderAt(ctx, doc.project, frames, format, time, { width: W, height: H, images, brand, showGuides: !playing && Boolean(drag?.moving) });
    if (!playing) setLayout(layoutFrame(ctx, doc.project, doc.frames, frameIndex, format, W, H, images));
  }, [doc, brand, format, time, W, H, images, version, playing, frameIndex, drag?.moving, reduced]);

  const toCss = (b: Box) => ({ left: b.x / dpr, top: b.y / dpr, width: b.w / dpr, height: b.h / dpr });

  const nearest = (clientX: number, clientY: number, el: DragEl, safe: Rect): Anchor => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    const choices = ANCHORS;
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
    if (editing === el) return;
    const was = selected === el;
    onSelect(el);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ el, x: e.clientX, y: e.clientY, moving: false, anchor: null, was });
  };
  const move = (e: RPointerEvent) => {
    if (!drag || !layout) return;
    const moving = drag.moving || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4;
    if (!moving) return;
    setDrag({ ...drag, moving, anchor: nearest(e.clientX, e.clientY, drag.el, layout.safe) });
  };
  const up = () => {
    if (drag?.moving && drag.anchor) onMove(drag.el, drag.anchor);
    // A plain click on an already selected text box starts typing in place.
    else if (drag && !drag.moving && drag.was && drag.el !== "logo") setEditing(drag.el);
    setDrag(null);
  };

  const sourceFrame = doc.frames[frameIndex];
  const frame = sourceFrame ? frameForFormat(sourceFrame, format) : undefined;
  const showTags = interactive && !playing && layout;
  const photoMode = interactive && !playing && (selected === "photo" || adjusting);

  // Wheel / trackpad pinch scale (50-200%); native non-passive listener so the page doesn't scroll.
  // One burst of wheel events (until 350ms idle) is one undo step.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  const burst = useRef<{ id: number; value: number; timer: ReturnType<typeof setTimeout> | null }>({ id: 0, value: 0, timer: null });
  wheelRef.current = (e: WheelEvent) => {
    if (!photoMode || !frame) return;
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    const b = burst.current;
    if (!b.timer) { b.id = ++sessions.current; b.value = photoScale(frame.photo); }
    else clearTimeout(b.timer);
    b.timer = setTimeout(() => { b.timer = null; }, 350);
    b.value = Math.min(SCALE_MAX, Math.max(SCALE_MIN, b.value * Math.exp(-dy * 0.0015)));
    onFocus({ scale: clampScale(b.value) }, `drag:scale-wheel:${b.id}`);
  };
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  const placeholderBox = (el: "headline" | "subline"): Box | null => {
    if (!layout || !frame) return null;
    if (el === "subline" && frame.subline?.mode === "image") return null;
    const t = frame[el];
    const under = el === "subline" && (t?.keep_under_headline ?? true);
    const safe = layout.safe;
    const fontPx = ((t?.size_px ?? (el === "headline" ? 108 : 48)) / 1080) * Math.min(W, H);
    const w = safe.w * 0.6;
    const h = fontPx * 1.3;
    if (under && layout.headline) return { x: layout.headline.x + (layout.headline.w - w) / 2, y: layout.headline.y + layout.headline.h + h * 0.2, w, h };
    const a = (t?.position ?? (el === "headline" ? "center" : "bottom-center")) as Anchor;
    const p = anchorPoint(a, safe);
    const x = a.endsWith("left") ? p.x : a.endsWith("right") ? p.x - w : p.x - w / 2;
    const y = a.startsWith("top") ? p.y : a.startsWith("bottom") ? p.y - h : p.y - h / 2;
    return { x, y, w, h };
  };

  const logoKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const cur = (doc.project.logo.frame_positions?.[frame?.id ?? ""]?.[format] ?? doc.project.logo.positions?.[format] ?? "top-right") as Anchor;
    const i = Math.max(0, ANCHORS.indexOf(cur));
    let r = Math.floor(i / 3), c = i % 3;
    if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
    if (e.key === "ArrowRight") c = Math.min(2, c + 1);
    if (e.key === "ArrowUp") r = Math.max(0, r - 1);
    if (e.key === "ArrowDown") r = Math.min(2, r + 1);
    const next = ANCHORS[r * 3 + c];
    if (next && next !== cur) onMove("logo", next);
  };

  const tag = (el: ElementKey, real: Box | null, draggable: boolean, text?: TextSettings | null) => {
    const empty = !real && (el === "headline" || el === "subline");
    const b = real ?? (empty ? placeholderBox(el as "headline" | "subline") : null);
    if (!b) return null;
    const meta = ELEMENT_META[el];
    const active = selected === el;
    const css = toCss(b);
    const pad = 4;
    return (
      <div
        key={el}
        className={cn("stage-el group/el absolute", active && "is-active", empty && !active && editing !== el && "opacity-0 hover:opacity-100", draggable && "cursor-grab", drag?.el === el && drag.moving && "cursor-grabbing")}
        tabIndex={el === "logo" ? 0 : undefined}
        aria-label={el === "logo" ? "Logo — use arrow keys to move" : undefined}
        onKeyDown={el === "logo" ? logoKey : undefined}
        style={{
          left: css.left - pad,
          top: css.top - pad,
          width: css.width + pad * 2,
          height: css.height + pad * 2,
          borderRadius: 4,
        }}
        onPointerDown={draggable ? down(el as DragEl) : undefined}
        onPointerMove={move}
        onPointerUp={up}
        onDoubleClick={() => (el === "headline" || el === "subline") && setEditing(el)}
      >
        {empty && editing !== el && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-sm text-[12px] font-medium text-background [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
            {el === "headline" ? "Add a headline" : "Add a subline"}
          </span>
        )}
        <Tag el={el} active={active} className={cn("absolute -top-[22px] left-[-2px]", !active && "opacity-0 group-hover/el:opacity-100")} />
        {active && draggable && !editing && (
          <span
            role="presentation"
            aria-hidden
            className="absolute -bottom-[5px] -right-[5px] size-2.5 cursor-nwse-resize rounded-[2px] border-2 bg-card"
            style={{ borderColor: "var(--accent-blue)" }}
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
        {editing === el && (
          <textarea
            autoFocus
            defaultValue={text?.text ?? ""}
            aria-label={`${meta.label} text`}
            className="absolute inset-0 resize-none rounded-sm bg-foreground/50 p-1 text-center leading-tight text-background outline-none"
            style={{ fontFamily: `"${fontFamilyOf(text ?? {})}"`, fontWeight: text?.font_weight ?? 700, fontSize: Math.max(12, (layoutFont(layout, el) / dpr) * 0.9) }}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              onText(el as "headline" | "subline", e.currentTarget.value);
              setEditing(null);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div ref={wrapRef} className="flex h-full min-h-0 w-full min-w-0 items-center justify-center">
      <div
        ref={surfaceRef}
        style={{ width: box.w, height: box.h, outline: selected === "photo" && showTags ? `2px solid var(--accent-blue)` : undefined, outlineOffset: 3, touchAction: photoMode ? "none" : undefined }}
        className={cn("relative rounded-lg shadow-ap-thumb", photoMode && (pan ? "cursor-grabbing" : "cursor-grab"))}
        onPointerDown={(e) => {
          onSelect("photo");
          if (!interactive || playing || !frame) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const img = frame.photo?.path ? images.get(frame.photo.path) : undefined;
          const f = photoOffset(frame.photo, img?.naturalWidth && W && H ? { iw: img.naturalWidth, ih: img.naturalHeight, W, H } : undefined);
          setPan({ x: e.clientX, y: e.clientY, fx: f.x, fy: f.y, id: ++sessions.current });
        }}
        onPointerMove={(e) => {
          if (!pan || !frame) return;
          if (Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < 3) return;
          const x = clampOffset(pan.fx + ((e.clientX - pan.x) / box.w) * 100);
          const y = clampOffset(pan.fy + ((e.clientY - pan.y) / box.h) * 100);
          onFocus({ offset: { x, y } }, `drag:offset:${pan.id}`);
        }}
        onPointerUp={() => setPan(null)}
        onPointerCancel={() => setPan(null)}
      >
        <canvas ref={canvasRef} width={W || 1} height={H || 1} className="block h-full w-full rounded-lg" aria-label="Ad preview" role="img" />
        {overlay && <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">{overlay}</div>}
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
        {photoMode && !drag && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground/70 px-2.5 py-1 text-[12px] text-background">
            {adjustHint ?? "Drag to move · scroll to scale"}
          </span>
        )}
        {drag?.moving && layout && (
          <div className="pointer-events-none absolute inset-0">
            {ANCHORS.map((a) => {
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
      style={active ? { background: "var(--accent-blue)", color: "var(--on-accent)" } : { background: "var(--card)", color: "var(--accent-blue)" }}
    >
      {meta.label}
    </span>
  );
}

export type { LogoPosition };

/** Reduced motion: the editor preview drops photo movement, text animation and transitions (exports are unchanged). */
const calmCache = new WeakMap<Frame[], Frame[]>();
function calmFrames(frames: Frame[]): Frame[] {
  const hit = calmCache.get(frames);
  if (hit) return hit;
  const out = frames.map((f) => ({
    ...f,
    photo: { ...f.photo, movement: "none" as const },
    transition_in: { ...f.transition_in, type: "cut" as const },
    headline: f.headline ? { ...f.headline, animation: "none" as const } : f.headline,
    subline: f.subline ? { ...f.subline, animation: "none" as const } : f.subline,
  }));
  calmCache.set(frames, out);
  return out;
}
