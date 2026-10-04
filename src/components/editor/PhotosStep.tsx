import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronRight, X } from "lucide-react";
import { AppButton, AppSectionLabel } from "@/components/app-ui";
import { ReelCard, StepActions, StepShell, StepTitle } from "@/components/app-ui/StepShell";
import { framePayloadFromPhoto, useTemplateName, type EditorDoc } from "@/lib/stillframe/data";
import { ACCEPTED_IMAGE_TYPES, uploadMedia } from "@/lib/stillframe/media";
import type { Format, Frame } from "@/lib/stillframe/types";
import { ALL_FORMATS } from "@/render/formats";
import { cn } from "@/lib/utils";
import { FrameThumb } from "./FrameThumb";
import { useReelPlayer } from "./ReelPreview";
import { useAutosave, useEditorDoc, useRenderAssets } from "./use-editor";

const MAX = 20;

export function PhotosStep({ initial, readOnly = false }: { initial: EditorDoc; readOnly?: boolean }) {
  const { doc, apply } = useEditorDoc(initial);
  const status = useAutosave(doc, !readOnly);
  const player = useReelPlayer(doc);
  const { images, version } = useRenderAssets(doc, player.brand);
  const templateName = useTemplateName(doc.project.template_id);
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
          photo: { ...(payload.photo as Frame["photo"]), darken_for_text: false },
          headline: null,
        });
      }
      apply((d) => ({ ...d, frames: [...d.frames, ...added] }));
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
  const toggleFormat = (f: Format, on: boolean) =>
    apply((d) => {
      const set = new Set(d.project.formats);
      if (on) set.add(f);
      else if (set.size > 1) set.delete(f);
      return { ...d, project: { ...d.project, formats: ALL_FORMATS.filter((x) => set.has(x)) } };
    });

  const meta = [templateName, `${frames.length} ${frames.length === 1 ? "photo" : "photos"}`, `${player.total.toFixed(1)} sec`].filter(Boolean).join(" · ");

  return (
    <StepShell
      adId={doc.project.id}
      step="photos"
      left={
        <ReelCard
          preview={player.preview}
          playing={player.playing}
          onTogglePlay={player.toggle}
          segments={player.segments}
          time={player.time}
          total={player.total}
          name={doc.project.name}
          onRename={(name) => apply((d) => ({ ...d, project: { ...d.project, name } }))}
          readOnly={readOnly}
          meta={meta}
          status={readOnly ? undefined : status}
          formats={doc.project.formats}
          format={player.format}
          onFormat={(f) => player.setFormat(f as Format)}
          onToggleFormat={(f, on) => toggleFormat(f as Format, on)}
        />
      }
    >
      <StepTitle title="Add your photos" lead="Each photo becomes a frame in your reel. Drag to change the order." />
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
          className={cn("rounded-[18px] border-2 border-dashed px-6 py-8 text-center transition-colors", dropping ? "border-ap-blue bg-ap-soft-blue" : "border-ap-hairline bg-ap-panel")}
        >
          <p className="text-[15px] font-semibold">Drop photos here</p>
          <p className="mt-1 text-[14px] text-ap-muted">JPG, PNG or HEIC, up to {MAX} photos. Phone photos are fine.</p>
          <AppButton variant="ghost" size="sm" className="mt-4 bg-ap-card" disabled={uploading || frames.length >= MAX} onClick={() => inputRef.current?.click()}>
            {uploading ? "Adding…" : "Choose Photos"}
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

        <AppSectionLabel className="mt-7 mb-3">Your photos · {frames.length}</AppSectionLabel>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {frames.map((f, i) => (
            <div
              key={f.id}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => { if (dragFrom !== null) { e.preventDefault(); setOver(i); } }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) reorder(dragFrom, i); setDragFrom(null); setOver(null); }}
              onDragEnd={() => { setDragFrom(null); setOver(null); }}
              className={cn(
                "group relative aspect-square cursor-grab overflow-hidden rounded-lg bg-ap-media shadow-ap-soft ring-1 ring-ap-inner",
                over === i && dragFrom !== i && "ring-2 ring-ap-blue",
                dragFrom === i && "opacity-50",
              )}
            >
              <FrameThumb doc={doc} index={i} format="1:1" images={images} version={version} width={200} className="pointer-events-none h-full w-full" />
              <span className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-ap-ink/75 text-[11px] font-semibold text-ap-card nums">{i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ap-ink/75 text-ap-card opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 rounded-[14px] bg-ap-panel px-4 py-3.5 text-[14px]">
          <span><span className="font-semibold">Template:</span> {templateName ?? "None"}</span>
          <Link to="/app/templates" className="font-medium text-ap-blue">Change template</Link>
        </div>
      </div>
      <StepActions note="You can add or swap photos later in Edit.">
        <AppButton asChild size="lg">
          <Link to="/app/ad/$id/edit" params={{ id: doc.project.id }}>Next: Edit <ChevronRight className="size-4" strokeWidth={1.7} /></Link>
        </AppButton>
      </StepActions>
    </StepShell>
  );
}
