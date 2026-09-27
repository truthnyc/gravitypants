import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { framePayloadFromPhoto, logoFromBrandKit, useBrandKit, useUpdateBrandKit, type EditorDoc } from "@/lib/stillframe/data";
import { ACCEPTED_IMAGE_TYPES, uploadMedia } from "@/lib/stillframe/media";
import { registerCustomFonts } from "@/lib/stillframe/fonts";
import {
  PACE_SECONDS,
  type Format,
  type Frame,
  type LogoSettings,
  type Pace,
  type PhotoSettings,
  type TextSettings,
  type TransitionSettings,
} from "@/lib/stillframe/types";
import { ALL_FORMATS, FORMAT_SIZE } from "@/render/formats";
import { DEFAULT_FONT, END_CARD_SECONDS, endCardOf, frameIndexAt, restTime, videoDuration, type Anchor, type BrandStyle } from "@/render/renderFrame";
import { EditorHeader } from "./EditorHeader";
import { FrameRail } from "./FrameRail";
import { Inspector, type InspectorActions } from "./Inspector";
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
const NEW_SUBLINE: TextSettings = {
  text: "",
  font_family: DEFAULT_FONT,
  font_weight: 500,
  size_px: 48,
  color: "#FFFFFF",
  animation: "fade",
  position: "bottom-center",
  same_on_all: false,
  keep_under_headline: true,
};
const STYLE_KEYS = ["font_family", "font_weight", "size_px", "color", "animation", "position", "keep_under_headline"] as const;
type FrameStyle = Pick<Frame, "transition_in"> & {
  photo: Pick<PhotoSettings, "fit" | "movement" | "brightness" | "darken_for_text" | "background_color">;
  headline: Partial<TextSettings> | null;
  subline: Partial<TextSettings> | null;
};
const pickStyle = (t: TextSettings | null) =>
  t ? (Object.fromEntries(STYLE_KEYS.filter((k) => t[k] !== undefined).map((k) => [k, t[k]])) as Partial<TextSettings>) : null;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.getAttribute("role") === "combobox"));
}

export function Editor({ initial }: { initial: EditorDoc }) {
  const { doc, apply, undo, redo, canUndo } = useEditorDoc(initial);
  const status = useAutosave(doc);

  const [frameIndex, setFrameIndex] = useState(0);
  const [selected, setSelected] = useState<ElementKey>("headline");
  const [format, setFormat] = useState<Format>(initial.project.primary_format);
  const [time, setTime] = useState(() => restTime(initial.frames, 0));
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [styleClip, setStyleClip] = useState<FrameStyle | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceAt = useRef(0);
  const { data: kit } = useBrandKit();
  const updateKit = useUpdateBrandKit();
  const brand = useMemo<BrandStyle>(
    () => ({ color: kit?.colors[0] ?? null, font: kit?.body_font ?? null, endCard: kit?.end_card ?? null }),
    [kit?.colors, kit?.body_font, kit?.end_card],
  );
  const { images, version } = useRenderAssets(doc, brand);
  const endSeconds = endCardOf(doc.project, brand).enabled ? END_CARD_SECONDS : 0;

  useEffect(() => {
    if (kit?.custom_fonts.length) void registerCustomFonts(kit.custom_fonts);
  }, [kit?.custom_fonts]);

  const frames = doc.frames;
  const idx = Math.min(frameIndex, Math.max(0, frames.length - 1));
  const frame = frames[idx];
  const total = videoDuration(doc.project, frames, brand);

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

  const updateText = (el: "headline" | "subline", patch: Partial<TextSettings>, key?: string) => {
    const base = el === "headline" ? NEW_HEADLINE : NEW_SUBLINE;
    apply((d) => {
      const current = { ...base, ...(d.frames[idx]?.[el] ?? {}), ...patch };
      const shareStyle = current.same_on_all;
      const style = Object.fromEntries(STYLE_KEYS.map((k) => [k, current[k]]));
      return {
        ...d,
        frames: d.frames.map((f, j) => {
          if (j === idx) return { ...f, [el]: current };
          if (shareStyle) return { ...f, [el]: { ...base, ...(f[el] ?? {}), ...style, same_on_all: true } };
          return f;
        }),
      };
    }, key);
  };
  const updateHeadline = (patch: Partial<TextSettings>, key?: string) => updateText("headline", patch, key);
  const updateLogo = (patch: Partial<LogoSettings>, key?: string) =>
    apply((d) => ({ ...d, project: { ...d.project, logo: { ...d.project.logo, ...patch } } }), key);
  const updatePhoto = (patch: Partial<PhotoSettings>, key?: string) =>
    updateFrame(idx, (f) => ({ ...f, photo: { ...f.photo, ...patch } }), key);

  const sizeOf = (el: "headline" | "subline" | "logo") =>
    el === "logo" ? (doc.project.logo.size_pct ?? 16) : (frame?.[el]?.size_px ?? (el === "headline" ? 108 : 48));
  const resizeEl = (el: "headline" | "subline" | "logo", v: number, key?: string) => {
    if (el === "logo") return updateLogo({ size_pct: Math.round(Math.min(40, Math.max(5, v))) }, key);
    updateText(el, { size_px: Math.round(Math.min(240, Math.max(24, v))) }, key);
  };

  const setText = (el: "headline" | "subline", text: string) => {
    if (el === "headline") return updateHeadline({ text });
    updateText("subline", { text });
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

  const duplicateFrame = (at = idx) => {
    const src = frames[at];
    if (!src) return;
    const copy = { ...structuredClone(src), id: crypto.randomUUID() };
    apply((d) => {
      const next = [...d.frames];
      next.splice(at + 1, 0, copy);
      return { ...d, frames: next };
    });
    setFrameIndex(at + 1);
  };

  const copyStyle = (at: number) => {
    const f = frames[at];
    if (!f) return;
    const p = f.photo ?? {};
    const photo = Object.fromEntries(
      (["fit", "movement", "brightness", "darken_for_text", "background_color"] as const).filter((k) => p[k] !== undefined).map((k) => [k, p[k]]),
    ) as FrameStyle["photo"];
    setStyleClip({
      transition_in: f.transition_in,
      photo,
      headline: pickStyle(f.headline),
      subline: pickStyle(f.subline),
    });
    toast("Style copied");
  };
  const pasteStyle = (at: number) => {
    if (!styleClip) return;
    updateFrame(at, (f) => ({
      ...f,
      transition_in: at === 0 ? f.transition_in : styleClip.transition_in,
      photo: { ...f.photo, ...styleClip.photo },
      headline: styleClip.headline && f.headline ? { ...f.headline, ...styleClip.headline } : f.headline,
      subline: styleClip.subline && f.subline ? { ...f.subline, ...styleClip.subline } : f.subline,
    }));
  };
  const replacePhoto = (at: number) => {
    replaceAt.current = at;
    replaceRef.current?.click();
  };
  const onReplaceFile = async (file: File) => {
    setUploading(true);
    try {
      const up = await uploadMedia(file, "photo");
      updateFrame(replaceAt.current, (f) => ({
        ...f,
        photo: { ...f.photo, asset_id: up.assetId, path: up.path, url: up.path, focus: { x: 0.5, y: 0.5 }, zoom: 1 },
      }));
    } catch {
      toast.error("That photo couldn't be added. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const addLogo = async (file: File) => {
    try {
      const up = await uploadMedia(file, "logo");
      const logos = [...(kit?.logos ?? []), { id: crypto.randomUUID(), path: up.path, name: file.name, role: "primary" as const }];
      await updateKit.mutateAsync({ logos });
      const next = logoFromBrandKit(kit ? { ...kit, logos } : null, doc.project.logo);
      updateLogo({ path: up.path, dark_path: next.dark_path ?? up.path, light_path: next.light_path ?? null });
      toast("Logo added to your Brand Kit");
    } catch {
      toast.error("That logo couldn't be uploaded. Try again.");
    }
  };

  const deleteFrame = useCallback((at?: number) => {
    if (frames.length <= 1) {
      toast("An ad needs at least one frame.");
      return;
    }
    const i = at ?? idx;
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

  const updateTextRef = useRef(updateText);
  updateTextRef.current = updateText;

  const actions: InspectorActions = {
    onPhoto: updatePhoto,
    onText: updateText,
    onLogo: updateLogo,
    onLogoVisible: (v) => updateFrame(idx, (f) => ({ ...f, logo_visible: v })),
    onDuration: (sec, key) => {
      const same = frames.every((f) => f.duration_sec === frames[0]?.duration_sec) && frames.length > 1;
      if (same) apply((d) => ({ ...d, frames: d.frames.map((f) => ({ ...f, duration_sec: sec })) }), key ?? "duration-all");
      else setDuration(idx, sec);
    },
    onSameLength: (on) => {
      if (on && frame) apply((d) => ({ ...d, frames: d.frames.map((f) => ({ ...f, duration_sec: frame.duration_sec })) }));
    },
    onPace: (pace: Pace) =>
      apply((d) => ({
        ...d,
        project: { ...d.project, pace },
        frames: d.frames.map((f) => ({ ...f, duration_sec: PACE_SECONDS[pace] })),
      })),
    onTransition: (patch: Partial<TransitionSettings>) =>
      updateFrame(idx, (f) => ({ ...f, transition_in: { ...{ type: "cut" as const, speed: "smooth" as const }, ...f.transition_in, ...patch } })),
    onTransitionAll: () => {
      const tr = frame?.transition_in;
      if (tr) apply((d) => ({ ...d, frames: d.frames.map((f, j) => (j === 0 ? f : { ...f, transition_in: { ...tr } })) }));
    },
    onReplacePhoto: () => replacePhoto(idx),
    onAdjust: () => {
      setSelected("photo");
      setAdjusting((a) => !a);
    },
    onAddLogo: (file) => void addLogo(file),
  };

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
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        if (selected === "headline" || selected === "subline") {
          e.preventDefault();
          const cur = frames[idx]?.[selected]?.size_px ?? (selected === "headline" ? 108 : 48);
          const v = Math.min(240, Math.max(24, cur + (e.key === "ArrowUp" ? 4 : -4)));
          updateTextRef.current(selected, { size_px: v }, `${selected}-nudge`);
        }
        return;
      }
      if (e.key === "Escape" && adjusting) {
        setAdjusting(false);
        return;
      }
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
  }, [undo, redo, togglePlay, selectFrame, idx, deleteFrame, selected, frames, adjusting]);

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
          canPaste={Boolean(styleClip)}
          onDuplicate={duplicateFrame}
          onReplacePhoto={replacePhoto}
          onCopyStyle={copyStyle}
          onPasteStyle={pasteStyle}
          onDelete={(i) => deleteFrame(i)}
        />
        <input
          ref={replaceRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onReplaceFile(f);
          }}
        />

        <main className="flex min-w-0 flex-1 flex-col px-8 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold nums">
              Frame {idx + 1} of {frames.length}
            </span>
            <Button variant="plain" size="sm" onClick={() => duplicateFrame()}>
              <Copy strokeWidth={1.7} /> Duplicate
            </Button>
            <Button variant="destructive-plain" size="sm" onClick={() => deleteFrame()}>
              <Trash2 strokeWidth={1.7} /> Delete
            </Button>
          </div>

          <div className="min-h-0 flex-1 py-8">
            <Stage
              doc={doc}
              brand={brand}
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
              adjusting={adjusting && selected === "photo"}
              sizeOf={sizeOf}
              onResize={resizeEl}
              onFocus={(patch, key) => updatePhoto(patch, key)}
              onAdjustDone={() => setAdjusting(false)}
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
          endSeconds={endSeconds}
          frame={frame}
          frameIndex={idx}
          format={format}
          selected={selected}
          kit={kit}
          adjusting={adjusting}
          onSelect={(el) => {
            setSelected(el);
            if (el !== "photo") setAdjusting(false);
          }}
          actions={actions}
        />
      </div>

      <Timeline
        frames={frames}
        endSeconds={endSeconds}
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
