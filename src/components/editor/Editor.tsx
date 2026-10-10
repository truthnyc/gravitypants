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
import { changeFrameLength } from "./frame-timing";
import { frameStarts, transitionDuration } from "@/render/renderFrame";
import { checkFit, type FitIssue } from "./fit-check";

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

const PREVIEW_SHAPES: Format[] = ["9:16", "4:5", "1:1", "16:9"];

export function Editor({ initial, readOnly = false, banner, exportDisabled = false }: { initial: EditorDoc; readOnly?: boolean; banner?: import("react").ReactNode; exportDisabled?: boolean }) {
  const { doc, apply, undo, redo, canUndo } = useEditorDoc(initial);
  const status = useAutosave(doc, !readOnly);

  const [frameIndex, setFrameIndex] = useState(0);
  const [selected, setSelected] = useState<ElementKey>("headline");
  // Preview shape; 4:5 is a real format with its own layout rules.
  const [format, setFormat] = useState<Format>(initial.project.primary_format);
  const [time, setTime] = useState(() => restTime(initial.frames, 0));
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [fontPreview, setFontPreview] = useState<{ el: "headline" | "subline"; family: string; weight: number } | null>(null);
  const [keyframe, setKeyframe] = useState<"start" | "end" | null>(null);
  const keyDrag = useRef<{ key: string; pan0: number } | null>(null);
  const [styleClip, setStyleClip] = useState<FrameStyle | null>(null);
  const [sameLength, setSameLength] = useState(false);
  const [sameTransition, setSameTransition] = useState(false);
  // "Same for all frames" switches are remembered per ad.
  const sameKey = `sf-same:${initial.project.id}`;
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(sameKey) ?? "{}");
      if (v.length) setSameLength(true);
      if (v.transition) setSameTransition(true);
    } catch { /* ignore */ }
  }, [sameKey]);
  useEffect(() => {
    try { localStorage.setItem(sameKey, JSON.stringify({ length: sameLength, transition: sameTransition })); } catch { /* ignore */ }
  }, [sameKey, sameLength, sameTransition]);
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
  // Font picker hover shows the font on the preview without touching the saved ad.
  const stageDoc = useMemo(() => {
    if (!fontPreview || !frame?.[fontPreview.el]) return doc;
    const patch = { font_family: fontPreview.family, font_weight: fontPreview.weight };
    return { ...doc, frames: doc.frames.map((f, j) => (j === idx ? { ...f, [fontPreview.el]: { ...f[fontPreview.el], ...patch } } : f)) };
  }, [doc, fontPreview, idx, frame]);

  // Older ads with a single logo: file it as the light or dark version by its brightness.
  const migratedLogo = useRef(false);
  useEffect(() => {
    const lg = doc.project.logo;
    if (migratedLogo.current || !lg.path || lg.light_path || lg.dark_path) return;
    const img = images.get(lg.path);
    if (!img?.naturalWidth) return;
    migratedLogo.current = true;
    void import("@/lib/stillframe/logo-file").then(({ isLightArtwork }) => {
      try {
        const c = document.createElement("canvas");
        c.width = Math.min(200, img.naturalWidth);
        c.height = Math.max(1, Math.round((c.width * img.naturalHeight) / img.naturalWidth));
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const light = isLightArtwork(ctx.getImageData(0, 0, c.width, c.height).data);
        const p = lg.path ?? null; updateLogo(light ? { light_path: p } : { dark_path: p });
      } catch { /* cross-origin image: leave as is */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, version, doc.project.logo.path]);

  // Fit warnings: lay every frame out at each size (debounced, and again when fonts finish loading).
  const [fitIssues, setFitIssues] = useState<FitIssue[]>([]);
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    const bump = () => setFontsTick((n) => n + 1);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setFitIssues(checkFit(doc, images)), 150);
    return () => clearTimeout(t);
  }, [doc, images, version, fontsTick]);
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
  const previewStop = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let stop = false;
      setTime((t) => {
        const next = t + dt;
        const end = previewStop.current ?? total;
        if (next >= end) {
          stop = true;
          previewStop.current = null;
          return end;
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
    previewStop.current = null;
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
      const was = d.frames[idx];
      const hadWords = Boolean(was?.headline?.text?.trim() || was?.subline?.text?.trim());
      const autoDarken = !hadWords && Boolean(patch.text?.trim()) && !was?.photo?.darken_set;
      return {
        ...d,
        frames: d.frames.map((f, j) => {
          if (j === idx) return { ...f, [el]: current, ...(autoDarken ? { photo: { ...f.photo, darken_for_text: true } } : {}) };
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

  const setDuration = (i: number, seconds: number, key?: string) =>
    apply((d) => ({ ...d, frames: changeFrameLength(d.frames, i, seconds, sameLength) }), key ?? `duration-${i}`);

  const playFrame = (i = idx) => {
    const target = frames[i];
    if (!target) return;
    const start = frameStarts(frames)[i] ?? 0;
    previewStop.current = start + target.duration_sec - 0.02;
    setTime(start);
    setFrameIndex(i);
    setPlaying(true);
  };

  // While Custom movement is edited, park the preview on the chosen keyframe.
  useEffect(() => {
    if (!keyframe || !frame) return;
    if (frame.photo?.movement !== "custom" || selected !== "photo") { setKeyframe(null); return; }
    const start = frameStarts(frames)[idx] ?? 0;
    const lead = idx > 0 ? Math.min(transitionDuration(frame.transition_in), frame.duration_sec / 2) : 0;
    setPlaying(false);
    setTime(keyframe === "start" ? start + lead + 0.01 : start + frame.duration_sec - 0.02);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyframe, idx, selected, frame?.photo?.movement]);

  const onStageFocus = (patch: { focus?: { x: number; y: number }; zoom?: number }, key: string) => {
    if (!keyframe || !frame) return updatePhoto(patch, key);
    const p = frame.photo ?? {};
    if (patch.zoom !== undefined) {
      const cur = keyframe === "start" ? (p.zoom_start ?? 1) : (p.zoom_end ?? 1);
      const delta = patch.zoom - (p.zoom ?? 1);
      const z = Math.min(1.5, Math.max(1, cur + delta));
      return updatePhoto(keyframe === "start" ? { zoom_start: z } : { zoom_end: z }, `kf-zoom-${keyframe}`);
    }
    if (patch.focus) {
      if (keyDrag.current?.key !== key) keyDrag.current = { key, pan0: Number(p.pan_x ?? 0) };
      const d = (p.focus?.x ?? 0.5) - patch.focus.x;
      const px = keyDrag.current.pan0 + (keyframe === "start" ? -1 : 1) * d * 20;
      updatePhoto({ pan_x: Math.max(-1, Math.min(1, px)) }, key);
    }
  };

  const playTransition = (i: number, patch: Partial<TransitionSettings>) => {
    const target = frames[i];
    if (!target || i === 0) return;
    const transition = { ...target.transition_in, ...patch };
    const start = frameStarts(frames)[i] ?? 0;
    const duration = Math.min(transitionDuration(transition), frames[i - 1]?.duration_sec ?? 0, target.duration_sec);
    previewStop.current = start + Math.min(0.25, target.duration_sec / 2);
    setTime(Math.max(0, start - Math.max(0.1, duration)));
    setFrameIndex(i);
    setPlaying(true);
  };

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

  const addLogo = async (raw: File, wanted: "light" | "dark" | "auto") => {
    try {
      const { prepareLogo } = await import("@/lib/stillframe/logo-file");
      const prep = await prepareLogo(raw);
      const variant = wanted === "auto" ? (prep.light ? "light" : "dark") : wanted;
      if (prep.warning) toast.warning(prep.warning);
      const up = await uploadMedia(prep.file, "logo");
      updateLogo(variant === "light"
        ? { path: doc.project.logo.path ?? up.path, light_path: up.path }
        : { path: doc.project.logo.path ?? up.path, dark_path: up.path });
      toast(wanted === "auto" ? `Added as your ${variant === "light" ? "Light logo (for dark photos)" : "Dark logo (for light photos)"}` : `${variant === "light" ? "Light" : "Dark"} logo added`);
    } catch {
      toast.error("That logo couldn't be uploaded. Try again.");
    }
  };

  const makeLogo = async (variant: "light" | "dark") => {
    const lg = doc.project.logo;
    const srcPath = variant === "light" ? (lg.dark_path ?? lg.path) : (lg.light_path ?? lg.path);
    if (!srcPath) return;
    try {
      const [{ monoLogo }, { getMediaUrl }] = await Promise.all([import("@/lib/stillframe/logo-file"), import("@/lib/stillframe/media")]);
      const url = await getMediaUrl(srcPath);
      if (!url) throw new Error("no url");
      const file = await monoLogo(url, variant === "light" ? "white" : "black", "logo");
      const up = await uploadMedia(file, "logo");
      updateLogo(variant === "light" ? { light_path: up.path } : { dark_path: up.path });
      toast(`${variant === "light" ? "Light" : "Dark"} logo made`, { action: { label: "Undo", onClick: () => undo() } });
    } catch {
      toast.error("That version couldn't be made. Try uploading one instead.");
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
    onPhotoAll: (patch, key) => apply((d) => ({ ...d, frames: d.frames.map((f) => ({ ...f, photo: { ...f.photo, ...patch } })) }), key),
    onPlayFrame: () => playFrame(idx),
    onMakeLogo: (v) => void makeLogo(v),
    onFontPreview: setFontPreview,
    onUndo: () => undo(),
    onAdjust: () => {
      setSelected("photo");
      setAdjusting((a) => !a);
    },
    onAddLogo: (file, variant) => void addLogo(file, variant),
  };

  const actionsForFrame = (i: number): InspectorActions => ({
    ...actions,
    onDuration: (seconds, key) => setDuration(i, seconds, key),
    onSameLength: (on) => {
      setSameLength(on);
      const target = frames[i];
      if (on && target) apply((d) => ({ ...d, frames: changeFrameLength(d.frames, i, target.duration_sec, true) }));
    },
    onTransition: (patch) => {
      apply((d) => ({ ...d, frames: d.frames.map((f, j) => (j > 0 && (sameTransition || j === i)) ? { ...f, transition_in: { ...f.transition_in, ...patch } } : f) }));
      playTransition(i, patch);
    },
    onSameTransition: (on) => {
      setSameTransition(on);
      const target = frames[i];
      if (on && target) apply((d) => ({ ...d, frames: d.frames.map((f, j) => j > 0 ? { ...f, transition_in: { ...target.transition_in } } : f) }));
    },
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
      if ((e.target as HTMLElement | null)?.closest('[role="dialog"], [role="menu"], [role="slider"], [role="switch"], [role="radiogroup"]')) return;
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

  const formatIssues = (f: string) => fitIssues.filter((x) => x.format === f);
  const here = formatIssues(format)[0];
  const elsewhere = PREVIEW_SHAPES.filter((f) => f !== format && formatIssues(f).length);

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
                doc={stageDoc}
                brand={brand}
                frameIndex={idx}
                format={format}
                aspect={shape === "4:5" ? 4 / 5 : undefined}
                time={time}
                playing={playing}
                selected={selected}
                images={images}
                version={version}
                onSelect={setSelected}
                onMove={moveElement}
                onText={setText}
                adjusting={(adjusting || Boolean(keyframe)) && selected === "photo"}
                adjustHint={keyframe ? `Setting the ${keyframe} · drag to move · scroll to zoom` : undefined}
                sizeOf={sizeOf}
                onResize={resizeEl}
                onFocus={onStageFocus}
                onAdjustDone={() => { setAdjusting(false); setKeyframe(null); }}
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
          onSegment={(i) => { if (i < frames.length) selectFrame(i); }}
          sizesSlot={
            <>
            <div className="mt-5 flex items-center gap-3">
              <span className="shrink-0 text-[12px] font-semibold tracking-[0.08em] text-ap-muted uppercase">Preview as</span>
              <AppSegmented
                className="grid flex-1 grid-cols-4"
                value={shape}
                onChange={(f) => setShape(f as PreviewShape)}
                options={PREVIEW_SHAPES.map((f) => ({
                  value: f,
                  label: (
                    <span className="inline-flex items-center gap-1.5 nums">
                      {f}
                      {formatIssues(f).length > 0 && <span className="size-1.5 rounded-full bg-ap-amber" aria-label="has a fit problem" />}
                    </span>
                  ),
                }))}
              />
            </div>
            {(here || elsewhere.length > 0) && (
              <p className="mt-2 text-[12px] leading-snug text-ap-amber" role="status">
                {here ? (
                  <>
                    In {shape},{" "}
                    <button type="button" className="font-semibold underline underline-offset-2" onClick={() => selectFrame(here.frame)}>frame {here.frame + 1}</button>
                    : {here.text}. Try a smaller size or another position.
                  </>
                ) : (
                  <>Check {elsewhere.join(" and ")} — tap it to see where.</>
                )}
              </p>
            )}
            </>
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
          actionsForFrame={actionsForFrame}
          endSeconds={endSeconds}
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
        <div className="mt-5" />
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
          image={frame?.photo?.path ? images.get(frame.photo.path) : undefined}
          keyframe={keyframe}
          onKeyframe={setKeyframe}
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
