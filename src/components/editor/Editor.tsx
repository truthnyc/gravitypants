import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { framePayloadFromPhoto, type EditorDoc } from "@/lib/stillframe/data";
import { uploadMedia } from "@/lib/stillframe/media";
import type { Format, Frame, TextSettings } from "@/lib/stillframe/types";
import { ALL_FORMATS, FORMAT_SIZE } from "@/render/formats";
import { DEFAULT_FONT, frameIndexAt, restTime, totalDuration, type Anchor } from "@/render/renderFrame";
import { EditorHeader } from "./EditorHeader";
import { FrameRail } from "./FrameRail";
import { Inspector } from "./Inspector";
import { Stage } from "./Stage";
import { Timeline } from "./Timeline";
import { useAutosave, useEditorDoc, useRenderAssets, type ElementKey } from "./use-editor";
import { cn } from "@/lib/utils";

const NEW_HEADLINE: TextSettings = {
  text: "",
  font_family: DEFAULT_FONT,
  font_weight: 700,
  size_px: 108,
  color: "#FFFFFF",
  animation: "rise",
  position: "center",
  same_on_all: false,
};
const STYLE_KEYS = ["font_family", "font_weight", "size_px", "color", "animation", "position"] as const;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.getAttribute("role") === "combobox"));
}

export function Editor({ initial }: { initial: EditorDoc }) {
  const { doc, apply, undo, redo, canUndo } = useEditorDoc(initial);
  const status = useAutosave(doc);
  const { images, version } = useRenderAssets(doc);

  const [frameIndex, setFrameIndex] = useState(0);
  const [selected, setSelected] = useState<ElementKey>("headline");
  const [format, setFormat] = useState<Format>(initial.project.primary_format);
  const [time, setTime] = useState(() => restTime(initial.frames, 0));
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);

  const frames = doc.frames;
  const idx = Math.min(frameIndex, Math.max(0, frames.length - 1));
  const frame = frames[idx];
  const total = totalDuration(frames);

  const selectFrame = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(frames.length - 1, i));
      setPlaying(false);
      setFrameIndex(n);
      setTime(restTime(frames, n));
    },
    [frames],
  );

  // keep the still preview on the selected frame when its timing changes
  useEffect(() => {
    if (!playing) setTime((t) => (frameIndexAt(frames, t) === idx ? t : restTime(frames, idx)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames]);

  /* ---------------- playback */
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let stop = false;
      setTime((t) => {
        const next = t + dt;
        if (next >= total) {
          stop = true;
          return total;
        }
        return next;
      });
      if (stop) {
        setPlaying(false);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total]);

  useEffect(() => {
    if (playing) setFrameIndex(frameIndexAt(frames, time));
  }, [playing, time, frames]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && time >= total - 0.05) setTime(0);
      return !p;
    });
  }, [time, total]);

  const playVideo = () => {
    if (playing) {
      setPlaying(false);
      setTime(restTime(frames, idx));
      return;
    }
    setTime(0);
    setPlaying(true);
  };

  /* ---------------- edits */
  const updateFrame = useCallback(
    (i: number, fn: (f: Frame) => Frame, key?: string) =>
      apply((d) => ({ ...d, frames: d.frames.map((f, j) => (j === i ? fn(f) : f)) }), key),
    [apply],
  );

  const updateHeadline = (patch: Partial<TextSettings>, key?: string) => {
    apply((d) => {
      const current = { ...NEW_HEADLINE, ...(d.frames[idx]?.headline ?? {}), ...patch };
      const shareStyle = current.same_on_all;
      const style = Object.fromEntries(STYLE_KEYS.map((k) => [k, current[k]]));
      return {
        ...d,
        frames: d.frames.map((f, j) => {
          if (j === idx) return { ...f, headline: current };
          if (shareStyle && f.headline) return { ...f, headline: { ...f.headline, ...style, same_on_all: true } };
          return f;
        }),
      };
    }, key);
  };

  const setText = (el: "headline" | "subline", text: string) => {
    if (el === "headline") return updateHeadline({ text });
    updateFrame(idx, (f) => ({ ...f, subline: { ...(f.subline ?? {}), text } }));
  };

  const moveElement = (el: "headline" | "subline" | "logo", anchor: Anchor) => {
    if (el === "headline") return updateHeadline({ position: anchor });
    if (el === "subline")
      return updateFrame(idx, (f) => ({ ...f, subline: { ...(f.subline ?? {}), position: anchor, keep_under_headline: false } }));
    apply((d) => ({
      ...d,
      project: {
        ...d.project,
        logo: { ...d.project.logo, positions: { ...d.project.logo.positions, [format]: anchor as never } },
      },
    }));
  };

  const setDuration = (i: number, seconds: number) =>
    updateFrame(i, (f) => ({ ...f, duration_sec: seconds }), `duration-${i}`);

  const duplicateFrame = () => {
    if (!frame) return;
    const copy = { ...structuredClone(frame), id: crypto.randomUUID() };
    apply((d) => {
      const next = [...d.frames];
      next.splice(idx + 1, 0, copy);
      return { ...d, frames: next };
    });
    setFrameIndex(idx + 1);
  };

  const deleteFrame = useCallback(() => {
    if (frames.length <= 1) {
      toast("An ad needs at least one frame.");
      return;
    }
    const i = idx;
    apply((d) => ({ ...d, frames: d.frames.filter((_, j) => j !== i) }));
    setFrameIndex(Math.max(0, i - 1));
    toast(`Frame ${i + 1} deleted`, { action: { label: "Undo", onClick: () => undo() } });
  }, [apply, frames.length, idx, undo]);

  const reorder = (from: number, to: number) => {
    apply((d) => {
      const next = [...d.frames];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return { ...d, frames: next };
    });
    setFrameIndex(to);
  };

  const addFiles = async (files: File[]) => {
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
      const at = frames.length;
      apply((d) => ({ ...d, frames: [...d.frames, ...added] }));
      setFrameIndex(at);
      toast(`${added.length} ${added.length === 1 ? "frame" : "frames"} added`);
    } catch {
      toast.error("Some photos couldn't be added. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const toggleFormat = (f: Format, on: boolean) =>
    apply((d) => {
      const set = new Set(d.project.formats);
      if (on) set.add(f);
      else if (set.size > 1) set.delete(f);
      return { ...d, project: { ...d.project, formats: ALL_FORMATS.filter((x) => set.has(x)) } };
    });

  /* ---------------- keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        if (isTyping(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (isTyping(e.target) || mod) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        selectFrame(idx - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        selectFrame(idx + 1);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteFrame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, togglePlay, selectFrame, idx, deleteFrame]);

  if (!frame) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <EditorHeader
        id={doc.project.id}
        name={doc.project.name}
        status={status}
        canUndo={canUndo}
        playing={playing}
        onRename={(name) => apply((d) => ({ ...d, project: { ...d.project, name } }))}
        onUndo={undo}
        onPlayVideo={playVideo}
      />
      <div className="flex min-h-0 flex-1">
        <FrameRail
          doc={doc}
          format={format}
          frameIndex={idx}
          images={images}
          version={version}
          uploading={uploading}
          onSelect={selectFrame}
          onSelectTransition={(i) => {
            selectFrame(i);
            setSelected("transition");
          }}
          onReorder={reorder}
          onAddFiles={addFiles}
        />

        <main className="flex min-w-0 flex-1 flex-col px-8 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold nums">
              Frame {idx + 1} of {frames.length}
            </span>
            <Button variant="plain" size="sm" onClick={duplicateFrame}>
              <Copy strokeWidth={1.7} /> Duplicate
            </Button>
            <Button variant="destructive-plain" size="sm" onClick={deleteFrame}>
              <Trash2 strokeWidth={1.7} /> Delete
            </Button>
          </div>

          <div className="min-h-0 flex-1 py-8">
            <Stage
              doc={doc}
              frameIndex={idx}
              format={format}
              time={time}
              playing={playing}
              selected={selected}
              images={images}
              version={version}
              onSelect={setSelected}
              onMove={moveElement}
              onText={setText}
            />
          </div>

          <div className="flex items-end justify-center gap-4">
            {ALL_FORMATS.map((f) => {
              const s = FORMAT_SIZE[f];
              const included = doc.project.formats.includes(f);
              const active = f === format;
              return (
                <div key={f} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormat(f)}
                    className={cn(
                      "flex h-[54px] w-[64px] items-center justify-center rounded-sm",
                      active ? "bg-primary/10 ring-2 ring-primary" : "bg-card shadow-card",
                    )}
                    aria-label={`Preview ${f}`}
                    aria-pressed={active}
                  >
                    <span
                      className={cn("rounded-[2px]", active ? "bg-primary/60" : "bg-control-fill", !included && "opacity-40")}
                      style={{ width: (s.width / Math.max(s.width, s.height)) * 34, height: (s.height / Math.max(s.width, s.height)) * 34 }}
                    />
                  </button>
                  <label className="flex items-center gap-1.5 text-[12px] font-medium nums">
                    <Switch
                      checked={included}
                      onCheckedChange={(v) => toggleFormat(f, v)}
                      className="h-4 w-7 data-[state=checked]:bg-toggle-on [&>span]:size-3 [&>span]:data-[state=checked]:translate-x-3"
                      aria-label={`Include ${f} in export`}
                    />
                    {f}
                  </label>
                </div>
              );
            })}
          </div>
        </main>

        <Inspector
          doc={doc}
          frame={frame}
          frameIndex={idx}
          format={format}
          selected={selected}
          onSelect={setSelected}
          onHeadline={updateHeadline}
        />
      </div>

      <Timeline
        frames={frames}
        frameIndex={idx}
        time={time}
        playing={playing}
        onTogglePlay={togglePlay}
        onSeek={(t) => {
          setPlaying(false);
          setTime(t);
          setFrameIndex(frameIndexAt(frames, t));
        }}
        onSelectFrame={selectFrame}
        onDuration={setDuration}
      />
    </div>
  );
}
