import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronRight, X } from "lucide-react";
import { AppButton, AppSectionLabel } from "@/components/app-ui";
import { AdMenu, FrameStrip, StageBar, StageChip, StudioBottom, StudioCanvas, StudioPanel, StudioShell } from "@/components/app-ui/StudioLayout";
import { framePayloadFromPhoto, type EditorDoc } from "@/lib/stillframe/data";
import { MAIN_SIZES, sizeLabel } from "@/lib/stillframe/main-size";
import { ACCEPTED_IMAGE_TYPES, uploadMedia } from "@/lib/stillframe/media";
import type { Format, Frame } from "@/lib/stillframe/types";
import { cn } from "@/lib/utils";
import { FrameThumb } from "./FrameThumb";
import { useReelPlayer } from "./ReelPreview";
import { useAutosave, useEditorDoc, useRenderAssets } from "./use-editor";

const MAX = 20;

export function PhotosStep({ initial, readOnly = false }: { initial: EditorDoc; readOnly?: boolean }) {
  const { doc, apply, undo, redo, canUndo, canRedo } = useEditorDoc(initial);
  const status = useAutosave(doc, !readOnly);
  const player = useReelPlayer(doc);
  const { images, version } = useRenderAssets(doc, player.brand);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const frames = doc.frames;

  const addFiles = async (all: File[]) => {
    const files = all.filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name)).slice(0, Math.max(0, MAX - frames.length));
    if (!files.length) {
      if (all.length) toast(frames.length >= MAX ? `An ad can have up to ${MAX} photos.` : "Those files aren't photos.");
      return;
    }
    setUploading(true);
    try {
      const added: Frame[] = [];
      for (const file of files) {
        const photo = await uploadMedia(file, "photo");
        const payload = framePayloadFromPhoto(photo, 1);
        added.push({
          ...(payload as unknown as Frame),
          id: crypto.randomUUID(),
          project_id: doc.project.id,
          photo: payload.photo as Frame["photo"],
          headline: null,
        });
      }
      // Template frames without a photo are filled first, so their styles are kept.
      apply((d) => {
        const queue = [...added];
        const filled = d.frames.map((f) => (!f.photo?.path && queue.length ? { ...f, photo: { ...f.photo, ...queue.shift()!.photo } } : f));
        return { ...d, frames: [...filled, ...queue] };
      });
      toast(`${added.length} ${added.length === 1 ? "photo" : "photos"} added`);
    } catch {
      toast.error("Some photos couldn't be added. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => {
    if (frames.length <= 1) {
      toast("An ad needs at least one photo.");
      return;
    }
    apply((d) => ({ ...d, frames: d.frames.filter((_, j) => j !== i) }));
  };
  const reorder = (from: number, to: number) =>
    apply((d) => {
      const next = [...d.frames];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return { ...d, frames: next };
    });
  const set = (next: EditorDoc) => apply(() => next);
  const ratioOf = (f: Format) => { const s = MAIN_SIZES.find((x) => x.format === f)!; return s.width / s.height; };
  const px = MAIN_SIZES.find((x) => x.format === player.format)!;

  return (
    <StudioShell
      adId={doc.project.id}
      step="photos"
      title={{ name: doc.project.name, onRename: (name) => apply((d) => ({ ...d, project: { ...d.project, name } })), status: readOnly ? undefined : status, readOnly }}
      undo={readOnly ? undefined : { canUndo, canRedo, onUndo: undo, onRedo: redo }}
      menu={<AdMenu doc={doc} set={set} readOnly={readOnly} />}
      next={<AppButton asChild><Link to="/app/ad/$id/edit" params={{ id: doc.project.id }}>Next: Edit <ChevronRight className="size-4" strokeWidth={1.7} /></Link></AppButton>}
      panel={
        <StudioPanel step="photos" title="Add your photos">
          <p className="mb-4 text-[14px] leading-normal text-ap-body">Each photo becomes a frame in your {doc.project.primary_format} video. Drag to change the order.</p>
          <div className={cn(readOnly && "pointer-events-none opacity-60")}>
            <div
              onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDropping(true); } }}
              onDragLeave={() => setDropping(false)}
              onDrop={(e) => {
                if (!e.dataTransfer.files.length) return;
                e.preventDefault();
                setDropping(false);
                void addFiles(Array.from(e.dataTransfer.files));
              }}
              className={cn("rounded-[4px] border-2 border-dashed px-5 py-6 text-center transition-colors", dropping ? "border-ap-blue bg-ap-soft-blue" : "border-ap-hairline bg-ap-panel")}
            >
              <p className="text-[15px] font-semibold">Drop photos here</p>
              <p className="mt-1 text-[13px] text-ap-muted">JPG, PNG or HEIC, up to {MAX} photos. Phone photos are fine.</p>
              <AppButton variant="ghost" size="sm" className="mt-3 bg-ap-card" disabled={uploading || frames.length >= MAX} onClick={() => inputRef.current?.click()}>
                {uploading ? "Adding…" : "Choose photos"}
              </AppButton>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void addFiles(f); }}
              />
            </div>

            <AppSectionLabel className="mt-6 mb-3">Your photos · {frames.length}</AppSectionLabel>
            <div className="grid grid-cols-3 gap-3">
              {frames.map((f, i) => (
                <div
                  key={f.id}
                  draggable
                  onClick={() => player.seek(i)}
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => { if (dragFrom !== null) { e.preventDefault(); setOver(i); } }}
                  onDragLeave={() => setOver(null)}
                  onDrop={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) reorder(dragFrom, i); setDragFrom(null); setOver(null); }}
                  onDragEnd={() => { setDragFrom(null); setOver(null); }}
                  className={cn(
                    "group relative aspect-square cursor-grab overflow-hidden rounded-[4px] bg-ap-media shadow-ap-soft ring-1 ring-ap-inner",
                    player.frameIndex === i && "ring-2 ring-ap-blue",
                    over === i && dragFrom !== i && "ring-2 ring-ap-blue",
                    dragFrom === i && "opacity-50",
                  )}
                >
                  <FrameThumb doc={doc} index={i} format="1:1" images={images} version={version} width={200} className="pointer-events-none h-full w-full" />
                  <span className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-ap-ink/75 text-[11px] font-semibold text-ap-card nums">{i + 1}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); remove(i); }}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ap-ink/75 text-ap-card opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[13px] leading-normal text-ap-muted">The strip along the bottom shows the same frames. You can reorder them there too, and it stays the same in Edit.</p>
          </div>
        </StudioPanel>
      }
      stage={
        <>
          <StageBar label="Preview"><StageChip on>{sizeLabel(player.format)}</StageChip></StageBar>
          <StudioCanvas ratio={ratioOf(player.format)} label={`${player.format} · ${px.width} × ${px.height}`}>
            <div className="grid h-full w-full place-items-center">{player.preview}</div>
          </StudioCanvas>
        </>
      }
      bottom={
        <StudioBottom playing={player.playing} onTogglePlay={player.toggle} time={player.time} total={player.total} disabled={!frames.length}
          right={<span>{frames.length} {frames.length === 1 ? "frame" : "frames"} · {player.total.toFixed(1)} sec</span>}>
          <div className={cn(readOnly && "pointer-events-none select-none")}>
            <FrameStrip doc={doc} format={player.format} images={images} version={version} current={player.frameIndex} onSelect={player.seek} onReorder={reorder} onAdd={frames.length < MAX ? () => inputRef.current?.click() : undefined} />
          </div>
        </StudioBottom>
      }
    />
  );
}
