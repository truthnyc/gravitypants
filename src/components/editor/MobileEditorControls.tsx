import { useRef, useState } from "react";
import { Clock, Image as ImageIcon, Plus, Shapes, Sparkles, TextQuote, Type } from "lucide-react";
import type { EditorDoc } from "@/lib/stillframe/data";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/stillframe/media";
import type { Format } from "@/lib/stillframe/types";
import { FrameThumb } from "./FrameThumb";
import { ELEMENT_META, type ElementKey } from "./use-editor";
import { cn } from "@/lib/utils";

const ICONS: Record<ElementKey, typeof Type> = { photo: ImageIcon, headline: Type, subline: TextQuote, logo: Shapes, timing: Clock, transition: Sparkles };

export function MobileFrameStrip({ doc, format, frameIndex, images, version, uploading, onSelect, onReorder, onAddFiles }: { doc: EditorDoc; format: Format; frameIndex: number; images: Map<string, HTMLImageElement>; version: number; uploading: boolean; onSelect: (i: number) => void; onReorder: (from: number, to: number) => void; onAddFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef<number | null>(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const clear = () => { if (hold.current) clearTimeout(hold.current); hold.current = null; };
  const stop = () => { clear(); active.current = null; setDragging(null); };
  return <nav aria-label="Frames" className="flex shrink-0 gap-3 overflow-x-auto bg-rail px-4 py-3 hairline-t hairline-b lg:hidden">
    {doc.frames.map((frame, i) => <button key={frame.id} data-frame-index={i} type="button" aria-label={`Frame ${i + 1}`} onClick={(e) => { if (moved.current) { e.preventDefault(); moved.current = false; return; } onSelect(i); }} onPointerDown={(e) => { clear(); moved.current = false; e.currentTarget.setPointerCapture(e.pointerId); hold.current = setTimeout(() => { active.current = i; setDragging(i); navigator.vibrate?.(20); }, 450); }} onPointerMove={(e) => { if (active.current === null) return; e.preventDefault(); const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-frame-index]"); const to = Number(hit?.dataset.frameIndex); if (Number.isInteger(to) && to !== active.current) { onReorder(active.current, to); active.current = to; setDragging(to); moved.current = true; } }} onPointerUp={stop} onPointerCancel={stop} className="w-[58px] shrink-0 touch-pan-x select-none">
      <span className={cn("relative block h-[100px] w-[56px] overflow-hidden rounded-sm bg-control-fill", i === frameIndex && "ring-2 ring-primary ring-offset-2 ring-offset-rail", dragging === i && "opacity-60")}><FrameThumb doc={doc} index={i} format={format} images={images} version={version} width={112} className="h-full w-full" /><span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-foreground/75 text-[11px] font-semibold text-background nums">{i + 1}</span></span>
      <span className="mt-1 block text-center text-[13px] text-secondary-text nums">{frame.duration_sec.toFixed(1)}s</span>
    </button>)}
    <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex h-[100px] w-[56px] shrink-0 items-center justify-center rounded-sm border-2 border-dashed border-placeholder-border text-icon" aria-label="Add photos"><Plus className={cn("size-6", uploading && "animate-pulse")} strokeWidth={1.7} /></button>
    <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) onAddFiles(files); }} />
  </nav>;
}

export function MobileToolBar({ selected, onSelect }: { selected: ElementKey; onSelect: (el: ElementKey) => void }) {
  return <nav aria-label="Editing tools" className="grid shrink-0 grid-cols-6 bg-card px-1 pt-2 safe-bottom hairline-t lg:hidden">{(Object.keys(ELEMENT_META) as ElementKey[]).map((el) => { const Icon = ICONS[el]; const meta = ELEMENT_META[el]; return <button key={el} type="button" onClick={() => onSelect(el)} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[11px] sm:text-[13px]", selected === el && "bg-control-fill")}><span className="flex size-8 items-center justify-center rounded-lg" style={{ background: meta.color }}><Icon className="size-4 text-primary-foreground" strokeWidth={1.7} /></span><span className="max-w-full truncate">{meta.label}</span></button>; })}</nav>;
}