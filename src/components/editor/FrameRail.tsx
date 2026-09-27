import { useRef, useState } from "react";
import { ArrowDown, Plus } from "lucide-react";
import type { EditorDoc } from "@/lib/stillframe/data";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/stillframe/media";
import type { Format, Frame } from "@/lib/stillframe/types";
import { FrameThumb } from "./FrameThumb";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  cut: "Cut",
  fade: "Fade",
  slide: "Slide",
  zoom: "Zoom",
  wipe: "Wipe",
  dip_black: "Dip",
};

export function TransitionChip({ frame, compact, onClick }: { frame: Frame; compact?: boolean; onClick?: () => void }) {
  const label = LABEL[frame.transition_in?.type ?? "cut"] ?? "Cut";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-card font-medium text-el-timing shadow-segment",
        compact ? "h-4 px-1 text-[9px]" : "h-5 px-1.5 text-[10px]",
      )}
      aria-label={`Transition: ${label}`}
    >
      {!compact && <ArrowDown className="size-2.5" strokeWidth={1.7} />}
      {label}
    </button>
  );
}

export function FrameRail({
  doc,
  format,
  frameIndex,
  images,
  version,
  uploading,
  onSelect,
  onSelectTransition,
  onReorder,
  onAddFiles,
  canPaste,
  onDuplicate,
  onReplacePhoto,
  onCopyStyle,
  onPasteStyle,
  onDelete,
}: {
  doc: EditorDoc;
  format: Format;
  frameIndex: number;
  images: Map<string, HTMLImageElement>;
  version: number;
  uploading: boolean;
  onSelect: (i: number) => void;
  onSelectTransition: (i: number) => void;
  onReorder: (from: number, to: number) => void;
  onAddFiles: (files: File[]) => void;
  canPaste: boolean;
  onDuplicate: (i: number) => void;
  onReplacePhoto: (i: number) => void;
  onCopyStyle: (i: number) => void;
  onPasteStyle: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  return (
    <nav className="flex w-[132px] shrink-0 flex-col items-center overflow-y-auto border-r bg-rail py-4" aria-label="Frames">
      <div className="mb-3 self-start px-4 text-[11px] font-semibold tracking-[0.06em] text-secondary-text">FRAMES</div>
      {doc.frames.map((f, i) => (
        <div key={f.id} className="flex flex-col items-center">
          {i > 0 && (
            <div className="my-1.5">
              <TransitionChip frame={f} onClick={() => onSelectTransition(i)} />
            </div>
          )}
          <ContextMenu>
          <ContextMenuTrigger asChild>
          <button
            type="button"
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null && dragFrom !== i) onReorder(dragFrom, i);
              setDragFrom(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragFrom(null);
              setOver(null);
            }}
            onClick={() => onSelect(i)}
            className={cn(
              "relative h-[100px] w-[56px] overflow-hidden rounded-sm bg-control-fill",
              i === frameIndex && "ring-2 ring-primary ring-offset-2 ring-offset-rail",
              over === i && dragFrom !== i && "ring-2 ring-primary/40",
              dragFrom === i && "opacity-50",
            )}
            aria-label={`Frame ${i + 1}`}
          >
            <FrameThumb doc={doc} index={i} format={format} images={images} version={version} width={112} className="h-full w-full" />
            <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-foreground/70 text-[10px] font-semibold text-background nums">
              {i + 1}
            </span>
          </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-44">
            <ContextMenuItem onSelect={() => onDuplicate(i)}>Duplicate</ContextMenuItem>
            <ContextMenuItem onSelect={() => onReplacePhoto(i)}>Replace Photo…</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onCopyStyle(i)}>Copy Style</ContextMenuItem>
            <ContextMenuItem disabled={!canPaste} onSelect={() => onPasteStyle(i)}>Paste Style</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(i)}>Delete</ContextMenuItem>
          </ContextMenuContent>
          </ContextMenu>
          <span className="mt-1 text-[11px] text-secondary-text nums">{f.duration_sec.toFixed(1)}s</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Add photos"
        className="mt-4 flex h-[100px] w-[56px] shrink-0 items-center justify-center rounded-sm border border-dashed border-placeholder-border text-icon disabled:opacity-50"
      >
        <Plus className={cn("size-5", uploading && "animate-pulse")} strokeWidth={1.7} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onAddFiles(files);
        }}
      />
    </nav>
  );
}
