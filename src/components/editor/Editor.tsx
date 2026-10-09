import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, MoreHorizontal, Undo2 } from "lucide-react";
import { AppSegmented } from "@/components/app-ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { AppButton } from "@/components/app-ui";
import { ReelCard, StepActions, StepShell, StepTitle } from "@/components/app-ui/StepShell";
import { KitAgainButton } from "@/components/templates/KitAgain";
import { effectiveKit, framePayloadFromPhoto, useBrandKit, useBrandKits, useTemplateName, type EditorDoc } from "@/lib/stillframe/data";
import type { NamedBrandKit } from "@/lib/stillframe/types";
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
import { ALL_FORMATS } from "@/render/formats";
import { DEFAULT_FONT, END_CARD_SECONDS, endCardOf, frameIndexAt, restTime, videoDuration, type Anchor, type BrandStyle } from "@/render/renderFrame";
import { StaffMenu } from "./EditorHeader";
import { FrameRail } from "./FrameRail";
import { Inspector, type InspectorActions } from "./Inspector";
import { Stage } from "./Stage";
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
  photo: Pick<
    PhotoSettings,
    | "fit"
    | "movement"
    | "movement_intensity"
    | "zoom_start"
    | "zoom_end"
    | "pan_x"
    | "pan_y"
    | "brightness"
    | "darken_for_text"
    | "background_color"
  >;
  headline: Partial<TextSettings> | null;
  subline: Partial<TextSettings> | null;
};
const pickStyle = (t: TextSettings | null) =>
  t ? (Object.fromEntries(STYLE_KEYS.filter((k) => t[k] !== undefined).map((k) => [k, t[k]])) as Partial<TextSettings>) : null;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.getAttribute("role") === "combobox"));
}

export function Editor({ initial, readOnly = false, banner, exportDisabled = false }: { initial: EditorDoc; readOnly?: boolean; banner?: import("react").ReactNode; exportDisabled?: boolean }) {
  const { doc, apply, undo, redo, canUndo } = useEditorDoc(initial);
  const status = useAutosave(doc, !readOnly);

  const [frameIndex, setFrameIndex] = useState(0);
  const [selected, setSelected] = useState<ElementKey>("headline");
  const [format, setFormat] = useState<Format>(initial.project.primary_format);
  const [time, setTime] = useState(() => restTime(initial.frames, 0));
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [styleClip, setStyleClip] = useState<FrameStyle | null>(null);
  const [sameLength, setSameLength] = useState(false);
  const [sameTransition, setSameTransition] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceAt = useRef(0);
  const { data: settings } = useBrandKit();
  const { data: kits } = useBrandKits();
  const templateName = useTemplateName(initial.project.template_id);
  const named = kits?.find((k) => k.id === doc.project.brand_kit_id) ?? null;
  const kit = useMemo(() => (settings ? effectiveKit(settings, named) : settings), [settings, named]);

  /** Puts a kit's logo, fonts and colors on the ad; null keeps the ad as it is but unlinks it. */
  const applyKit = useCallback(
    (k: NamedBrandKit | null) =>
      apply((d) => {
        if (!k) return { ...d, project: { ...d.project, brand_kit_id: null, logo: { ...d.project.logo, kit_stamp: null } } };
        const hasLogo = Boolean(k.logo_url || k.logo_dark_url);
        const logo = {
          ...d.project.logo,
          ...(hasLogo ? { path: k.logo_url ?? k.logo_dark_url, dark_path: k.logo_url ?? null, light_path: k.logo_dark_url ?? null } : {}),
          kit_stamp: k.updated_at,
        };
        const font = (t: TextSettings | null, family: string | null) => (t && family ? { ...t, font_family: family } : t);
        return {
          ...d,
          project: { ...d.project, brand_kit_id: k.id, logo },
          frames: d.frames.map((f) => ({ ...f, headline: font(f.headline, k.headline_font), subline: font(f.subline, k.subline_font) })),
        };
      }),
    [apply],
  );

  // Later edits to the chosen kit flow into this ad the next time it's open.
  useEffect(() => {
    if (readOnly || !named) return;
    if (doc.project.logo.kit_stamp !== named.updated_at) applyKit(named);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [named?.id, named?.updated_at]);
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

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
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
    if (el === "logo") return updateLogo({ size_pct: Math.round(Math.min(100, Math.max(5, v))) }, key);
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
        logo: d.project.logo.frame_positions?.[frame?.id ?? ""]?.[format] && frame ? { ...d.project.logo, frame_positions: { ...d.project.logo.frame_positions, [frame.id]: { ...d.project.logo.frame_positions?.[frame.id], [format]: anchor } } } : { ...d.project.logo, positions: { ...d.project.logo.positions, [format]: anchor as never } },
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
      (
        [
          "fit",
          "movement",
          "movement_intensity",
          "zoom_start",
          "zoom_end",
          "pan_x",
          "pan_y",
          "brightness",
          "darken_for_text",
          "background_color",
        ] as const
      )
        .filter((k) => p[k] !== undefined)
        .map((k) => [k, p[k]]),
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

  const addLogo = async (file: File, variant: "light" | "dark") => {
    try {
      const up = await uploadMedia(file, "logo");
      updateLogo(variant === "light"
        ? { path: doc.project.logo.path ?? up.path, light_path: up.path }
        : { path: doc.project.logo.path ?? up.path, dark_path: up.path });
      toast(`${variant === "light" ? "Light" : "Dark"} logo added`);
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
    onKit: (id) => applyKit(kits?.find((k) => k.id === id) ?? null),
    onPhoto: updatePhoto,
    onText: updateText,
    onLogo: updateLogo,
    onLogoVisible: (v) => updateFrame(idx, (f) => ({ ...f, logo_visible: v })),
    onLogoVariant: (v) => updateFrame(idx, (f) => ({ ...f, logo_variant: v })),
    onLogoScope: (scope) => apply((d) => ({
      ...d,
      project: { ...d.project, logo: { ...d.project.logo, show_on: scope } },
      frames: scope === "selected"
        ? d.frames.map((f, i) => ({ ...f, logo_visible: i === idx }))
        : d.frames,
    })),
    onDuration: (sec, key) => {
      if (sameLength && frames.length > 1) apply((d) => ({ ...d, frames: d.frames.map((f) => ({ ...f, duration_sec: sec })) }), key ?? "duration-all");
      else setDuration(idx, sec);
    },
    sameLength,
    onSameLength: (on) => {
      setSameLength(on);
      if (on && frame) apply((d) => ({ ...d, frames: d.frames.map((f) => ({ ...f, duration_sec: frame.duration_sec })) }));
    },
    onPace: (pace: Pace) =>
      apply((d) => ({
        ...d,
        project: { ...d.project, pace },
        frames: d.frames.map((f) => ({ ...f, duration_sec: PACE_SECONDS[pace] })),
      })),
    onTransition: (patch: Partial<TransitionSettings>) => {
      const merge = (f: Frame) => ({ ...f, transition_in: { ...{ type: "cut" as const, speed: "smooth" as const }, ...f.transition_in, ...patch } });
      if (sameTransition) apply((d) => ({ ...d, frames: d.frames.map((f, j) => (j === 0 ? f : merge(f))) }));
      else updateFrame(idx, merge);
    },
    sameTransition,
    onSameTransition: (on: boolean) => {
      setSameTransition(on);
      if (!on) return;
      const tr = frame?.transition_in;
      if (tr) apply((d) => ({ ...d, frames: d.frames.map((f, j) => (j === 0 ? f : { ...f, transition_in: { ...tr } })) }));
    },
    onReplacePhoto: () => replacePhoto(idx),
    onAdjust: () => {
      setSelected("photo");
      setAdjusting((a) => !a);
    },
    onAddLogo: (file, variant) => void addLogo(file, variant),
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

  const meta = [templateName, `${frames.length} ${frames.length === 1 ? "photo" : "photos"}`, `${total.toFixed(1)} sec`].filter(Boolean).join(" · ");
  const segments = [...frames.map((f) => f.duration_sec), ...(endSeconds ? [endSeconds] : [])];

  return (
    <StepShell
      adId={doc.project.id}
      step="edit"
      title={{ name: doc.project.name, onRename: (name) => apply((d) => ({ ...d, project: { ...d.project, name } })), status: readOnly ? undefined : status, readOnly }}
      banner={banner}
      left={
        <ReelCard
          preview={
            <div className={cn("h-full w-full", readOnly && "pointer-events-none select-none")}>
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
          }
          playing={playing}
          onTogglePlay={togglePlay}
          segments={segments}
          time={time}
          total={total}
          name={doc.project.name}
          onRename={(name) => apply((d) => ({ ...d, project: { ...d.project, name } }))}
          readOnly={readOnly}
          meta={meta}
          status={readOnly ? undefined : status}
          formats={doc.project.formats}
          format={format}
          onFormat={(f) => setFormat(f as Format)}
          sizesSlot={
            <div className="mt-5 flex items-center gap-3">
              <span className="shrink-0 text-[12px] font-semibold tracking-[0.08em] text-ap-muted uppercase">Preview as</span>
              <AppSegmented
                className="grid flex-1 grid-cols-3"
                value={format as string}
                onChange={(f) => setFormat(f as Format)}
                options={(["9:16", "1:1", "16:9"] as const).map((f) => ({ value: f, label: <span className="nums">{f}</span> }))}
              />
            </div>
          }
        />
      }
    >
      <StepTitle
        title="Edit"
        lead="Tap anything on the preview to change it."
        actions={readOnly ? undefined : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AppButton variant="ghost" size="sm" aria-label="Brand kit for the whole video">
                  <span className="size-3 rounded-[3px] bg-ap-blue" style={kit?.colors?.[0] ? { background: kit.colors[0] } : undefined} aria-hidden />
                  Brand
                </AppButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[240px]">
                <DropdownMenuLabel>Brand kit for the whole video</DropdownMenuLabel>
                {kits?.length ? (
                  <DropdownMenuRadioGroup value={doc.project.brand_kit_id ?? ""} onValueChange={(v) => actions.onKit(v || null)}>
                    <DropdownMenuRadioItem value="">None</DropdownMenuRadioItem>
                    {kits.map((k) => <DropdownMenuRadioItem key={k.id} value={k.id}>{k.name}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                ) : (
                  <DropdownMenuItem asChild><Link to="/app/brand">Create a brand kit</Link></DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AppButton variant="ghost" size="sm" aria-label="More actions"><MoreHorizontal className="size-4" strokeWidth={1.7} /></AppButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem asChild><Link to="/app/ad/$id/photos" params={{ id: doc.project.id }}>Replace all photos…</Link></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => duplicateFrame()}>Duplicate this frame</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onSelect={() => deleteFrame()}>Delete this frame</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <StaffMenu adId={doc.project.id} />
          </>
        )}
      />
      <div className={cn(readOnly && "pointer-events-none select-none")} aria-readonly={readOnly || undefined}>
        <FrameRail
          horizontal
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
        <div className="mt-5 mb-4 flex items-center gap-2">
          <span className="mr-auto text-[15px] font-semibold nums">Frame {idx + 1} of {frames.length}</span>
        </div>
        <Inspector
          embedded
          hideKit
          doc={doc}
          endSeconds={endSeconds}
          frame={frame}
          frameIndex={idx}
          format={format}
          selected={selected}
          kit={kit} kits={kits ?? []} kitId={doc.project.brand_kit_id ?? null}
          adjusting={adjusting}
          onSelect={(el) => {
            setSelected(el);
            if (el !== "photo") setAdjusting(false);
          }}
          actions={actions}
        />
      </div>
      <StepActions>
        <AppButton variant="ghost" size="sm" onClick={undo} disabled={!canUndo || readOnly} aria-label="Undo"><Undo2 className="size-4" strokeWidth={1.7} /> Undo <kbd suppressHydrationWarning className="ml-1 font-ap text-[11px] text-ap-faint">{isMac ? "⌘Z" : "Ctrl+Z"}</kbd></AppButton>
        <KitAgainButton adId={doc.project.id} templateId={doc.project.template_id} />
        <span className="flex-1" />
        {exportDisabled ? (
          <AppButton size="lg" disabled>Next: Export <ChevronRight className="size-4" strokeWidth={1.7} /></AppButton>
        ) : (
          <AppButton asChild size="lg"><Link to="/app/ad/$id/export" params={{ id: doc.project.id }}>Next: Export <ChevronRight className="size-4" strokeWidth={1.7} /></Link></AppButton>
        )}
      </StepActions>
    </StepShell>
  );
}
