import { forwardRef, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { ArrowDown, ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import type { EditorDoc } from "@/lib/stillframe/data";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/stillframe/media";
import type { Format, Frame } from "@/lib/stillframe/types";
import { FrameThumb } from "./FrameThumb";
import { TimingPanel, TransitionPanel, type InspectorActions } from "./Inspector";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = { cut: "Cut", fade: "Fade", slide: "Slide", zoom: "Zoom", wipe: "Wipe", dip_black: "Dip" };
export const TransitionChip = forwardRef<HTMLButtonElement, Omit<ComponentPropsWithoutRef<typeof Button>, "onClick"> & { frame: Frame; compact?: boolean; onClick?: () => void }>(function TransitionChip({ frame, compact, onClick, className, ...props }, ref) {
  const label = LABEL[frame.transition_in?.type ?? "cut"] ?? "Cut";
  return <Button ref={ref} type="button" variant="plain" size="sm" {...props} onClick={(e) => { e.stopPropagation(); onClick?.(); }} onPointerDown={(e) => e.stopPropagation()} className={cn("gap-0.5 bg-card font-medium text-el-timing shadow-segment", compact ? "h-4 px-1 text-[9px]" : "h-6 px-1.5 text-[10px]", className)} aria-label={props["aria-label"] ?? `Transition: ${label}`}>
    {!compact && <ArrowDown className="size-2.5" strokeWidth={1.7} />}{label}
  </Button>;
});

type Props = {
  horizontal?: boolean; doc: EditorDoc; format: Format; frameIndex: number; images: Map<string, HTMLImageElement>; version: number; uploading: boolean;
  onSelect: (i: number) => void; onReorder: (from: number, to: number) => void; onAddFiles: (files: File[]) => void;
  canPaste: boolean; onDuplicate: (i: number) => void; onReplacePhoto: (i: number) => void; onCopyStyle: (i: number) => void; onPasteStyle: (i: number) => void; onDelete: (i: number) => void;
  actionsForFrame: (i: number) => InspectorActions; endSeconds: number;
};

export function FrameRail({ doc, format, frameIndex, images, version, uploading, onSelect, onReorder, onAddFiles, canPaste, onDuplicate, onReplacePhoto, onCopyStyle, onPasteStyle, onDelete, actionsForFrame, endSeconds }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [popup, setPopup] = useState<string | null>(null);
  return <nav ref={navRef} aria-label="Frames" tabIndex={0} className="-mx-1 flex items-start gap-2 overflow-x-auto px-1 pt-1 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-primary" onKeyDown={(e) => {
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault(); e.stopPropagation();
    const next = Math.max(0, Math.min(doc.frames.length - 1, frameIndex + (e.key === "ArrowLeft" ? -1 : 1)));
    onSelect(next); navRef.current?.querySelector<HTMLButtonElement>(`[data-select-frame="${next}"]`)?.focus();
  }}>
    {doc.frames.map((frame, i) => <div key={frame.id} className="flex shrink-0 items-start gap-2">
      {i > 0 && <div className="mt-4"><Popover open={popup === `transition:${frame.id}`} onOpenChange={(open) => { setPopup(open ? `transition:${frame.id}` : null); if (open) onSelect(i); }}>
        <PopoverTrigger asChild><TransitionChip frame={frame} aria-label={`Transition into frame ${i + 1}: ${LABEL[frame.transition_in?.type ?? "cut"]}`} /></PopoverTrigger>
        <PopoverContent side="bottom" align="center" collisionPadding={12} className="w-[320px] max-w-[calc(100vw-24px)] space-y-4" aria-label={`Transition into frame ${i + 1}`}>
          <h2 className="text-[12px] font-semibold text-ap-muted">TRANSITION INTO FRAME {i + 1}</h2>
          <TransitionPanel frames={doc.frames} frame={frame} first={false} actions={actionsForFrame(i)} />
        </PopoverContent>
      </Popover></div>}
      <div className="flex w-14 flex-col items-center">
        <div className="group relative size-14">
          <ContextMenu><ContextMenuTrigger asChild>
            <Button type="button" variant="ghost" data-select-frame={i} draggable aria-label={`Frame ${i + 1}`} aria-pressed={i === frameIndex}
              onDragStart={() => setDragFrom(i)} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) onReorder(dragFrom, i); setDragFrom(null); setOver(null); }} onDragEnd={() => { setDragFrom(null); setOver(null); }}
              onClick={() => onSelect(i)} className={cn("relative size-14 overflow-hidden rounded-[10px] bg-control-fill p-0", i === frameIndex && "ring-2 ring-primary ring-offset-2 ring-offset-card", over === i && dragFrom !== i && "ring-2 ring-primary/40", dragFrom === i && "opacity-50")}>
              <FrameThumb doc={doc} index={i} format={format} images={images} version={version} width={112} className="h-full w-full" />
              <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-foreground/70 text-[10px] font-semibold text-background tabular-nums">{i + 1}</span>
            </Button>
          </ContextMenuTrigger><ContextMenuContent className="w-44">
            <ContextMenuItem onSelect={() => onDuplicate(i)}>Duplicate</ContextMenuItem>
            <ContextMenuItem disabled={i === 0} onSelect={() => onReorder(i, i - 1)}>Move left</ContextMenuItem>
            <ContextMenuItem disabled={i === doc.frames.length - 1} onSelect={() => onReorder(i, i + 1)}>Move right</ContextMenuItem>
            <ContextMenuSeparator /><ContextMenuItem onSelect={() => onReplacePhoto(i)}>Replace Photo…</ContextMenuItem>
            <ContextMenuItem onSelect={() => onCopyStyle(i)}>Copy Style</ContextMenuItem><ContextMenuItem disabled={!canPaste} onSelect={() => onPasteStyle(i)}>Paste Style</ContextMenuItem>
            <ContextMenuSeparator /><ContextMenuItem className="text-destructive focus:text-destructive" disabled={doc.frames.length <= 1} onSelect={() => onDelete(i)}>Delete frame</ContextMenuItem>
          </ContextMenuContent></ContextMenu>
          <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="plain" size="icon" aria-label={`Frame ${i + 1} actions`} className={cn("absolute right-0.5 top-0.5 size-5 gap-0 rounded-sm bg-card/90 p-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100", i === frameIndex ? "opacity-100" : "opacity-0")}><MoreHorizontal className="size-3.5" strokeWidth={1.7} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start"><DropdownMenuItem onSelect={() => onDuplicate(i)}>Duplicate</DropdownMenuItem><DropdownMenuItem disabled={i === 0} onSelect={() => onReorder(i, i - 1)}>Move left</DropdownMenuItem><DropdownMenuItem disabled={i === doc.frames.length - 1} onSelect={() => onReorder(i, i + 1)}>Move right</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled={doc.frames.length <= 1} className="text-destructive focus:text-destructive" onSelect={() => onDelete(i)}>Delete frame</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Popover open={popup === `timing:${frame.id}`} onOpenChange={(open) => { setPopup(open ? `timing:${frame.id}` : null); if (open) onSelect(i); }}>
          <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" aria-label={`Frame ${i + 1} duration: ${frame.duration_sec.toFixed(1)} seconds`} className="mt-1 h-7 gap-0.5 px-1 text-[11px] text-secondary-text tabular-nums">{frame.duration_sec.toFixed(1)}s<ChevronDown className="size-2.5" strokeWidth={1.7} /></Button></PopoverTrigger>
          <PopoverContent side="bottom" align="start" collisionPadding={12} className="w-[320px] max-w-[calc(100vw-24px)] space-y-4" aria-label={`Timing for frame ${i + 1}`}>
            <h2 className="text-[12px] font-semibold text-ap-muted">SHOW FRAME {i + 1} FOR</h2>
            <div className="space-y-4"><TimingPanel frames={doc.frames} frame={frame} actions={actionsForFrame(i)} endSeconds={endSeconds} /></div>
          </PopoverContent>
        </Popover>
      </div>
    </div>)}
    <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()} disabled={uploading} aria-label="Add frame" className="ml-2 size-14 shrink-0 rounded-[10px] border border-dashed border-placeholder-border p-0 text-icon"><Plus className={cn("size-5", uploading && "animate-pulse")} strokeWidth={1.7} /></Button>
    <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) onAddFiles(files); }} />
  </nav>;
}
