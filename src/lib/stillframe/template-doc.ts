/* Editable shape of a ready-made template, shared by the admin builder, the server fns and the preview. */
import type { Frame, Format, ProjectWithFrames, TextSettings } from "./types";
import { DEFAULT_LOGO } from "./types";
import type { Template, TemplateSettings, TemplateSlide } from "./data";

export type DocSlide = TemplateSlide & {
  sample_photo?: string | null;
  photo_focus?: { x: number; y: number };
  photo_zoom?: number;
  photo_background_color?: string | null;
  transition_speed?: Frame["transition_in"]["speed"];
  headline_style?: Omit<TextSettings, "text" | "same_on_all">;
  subline_style?: Omit<TextSettings, "text" | "same_on_all"> | null;
  logo_visible?: boolean;
  logo_variant?: Frame["logo_variant"];
  /** Show this slide in template previews (grid cards, "Make it yours"). Defaults to true. */
  preview?: boolean;
};
export type DocStyle = {
  background_color: string;
  headline: { font: string | null; weight: number; size_px: number; color: string };
  subline: { font: string | null; weight?: number; size_px: number; color: string };
  text_position: string;
  logo_position: string;
  logo_path?: string | null;
  logo_size_pct?: number;
  logo_opacity?: "solid" | "soft";
  logo_show_on?: "all" | "first_last" | "selected";
  logo_version?: "auto" | "light" | "dark";
};
export type TemplateDoc = {
  name: string;
  slug: string;
  description: string;
  /** Starting title of ads made from this template. Empty = use the template name. */
  ad_title?: string;
  format: Format;
  is_reusable: boolean;
  featured: boolean;
  thumbnail_url: string | null;
  style: DocStyle;
  slides: DocSlide[];
};

export const MAX_SLIDES = 10;
export const PLAN_AUDIENCE = [
  ["simple", "Simple"],
  ["business", "Business"],
  ["team", "Team"],
] as const;

export const TRANSITIONS: [TemplateSlide["transition_in"], string][] = [
  ["none", "None"], ["fade", "Fade"], ["slide", "Slide"], ["swipe-left", "Swipe left"], ["zoom", "Zoom"], ["cut", "Cut"], ["dip-black", "Dip to black"],
];
export const TEXT_ANIMS: [TemplateSlide["text_animation"], string][] = [
  ["none", "None"], ["rise-up", "Rise up"], ["fade-in", "Fade in"], ["typewriter", "Typewriter"], ["zoom", "Pop"],
];
export const PHOTO_MOTIONS: [TemplateSlide["photo_motion"], string][] = [["none", "None"], ["slow-zoom-in", "Slow zoom in"], ["pan", "Pan"]];
export const label = <T extends string>(list: [T, string][], v: T) => list.find(([k]) => k === v)?.[1] ?? v;

const hy = (s: string | undefined | null, d: string) => (s ?? d).replace(/_/g, "-");

export const DEFAULT_STYLE: DocStyle = {
  background_color: "#1D1D1F",
  headline: { font: null, weight: 700, size_px: 96, color: "#FFFFFF" },
  subline: { font: null, size_px: 44, color: "#FFFFFF" },
  text_position: "center",
  logo_position: "top-right",
  logo_path: null,
  logo_size_pct: 16,
  logo_opacity: "solid",
  logo_show_on: "all",
  logo_version: "auto",
};

export const blankSlide = (n: number): DocSlide => ({
  role: `Slide ${n}`,
  duration_sec: 2.5,
  transition_in: n === 1 ? "none" : "fade",
  text_animation: "rise-up",
  photo_motion: "none",
  headline_placeholder: "Your headline",
  subline_placeholder: "A short line",
  sample_photo: null,
  photo_focus: { x: 0.5, y: 0.5 },
  photo_zoom: 1,
  logo_visible: true,
  logo_variant: null,
});

type Row = Template & { draft?: TemplateDoc | null; featured?: boolean };

/** The saved draft if there is one, otherwise the live template. */
export function docFromRow(t: Row): TemplateDoc {
  if (t.draft) return t.draft;
  const s = (t.style ?? {}) as Partial<DocStyle>;
  return {
    name: t.name,
    slug: t.slug ?? "",
    description: t.description ?? "",
    ad_title: t.settings?.ad_title ?? "",
    format: (t.format ?? "9:16") as Format,
    is_reusable: Boolean(t.is_reusable),
    featured: Boolean(t.featured),
    thumbnail_url: t.thumbnail_url,
    style: {
      background_color: s.background_color ?? DEFAULT_STYLE.background_color,
      headline: { ...DEFAULT_STYLE.headline, ...(s.headline ?? {}) },
      subline: { ...DEFAULT_STYLE.subline, ...(s.subline ?? {}) },
      text_position: hy(s.text_position, "center"),
      logo_position: hy(s.logo_position, "top-right"),
      logo_path: s.logo_path ?? null,
      logo_size_pct: s.logo_size_pct ?? 16,
      logo_opacity: s.logo_opacity ?? "solid",
      logo_show_on: s.logo_show_on ?? "all",
      logo_version: s.logo_version ?? "auto",
    },
    slides: (t.slides ?? []).map((x) => ({ ...x })),
  };
}

const TR: Record<TemplateSlide["transition_in"], Frame["transition_in"]["type"]> = { none: "cut", cut: "cut", fade: "fade", slide: "slide", "swipe-left": "wipe", zoom: "zoom", "dip-black": "dip_black" };
const TA: Record<TemplateSlide["text_animation"], NonNullable<NonNullable<Frame["headline"]>["animation"]>> = { none: "none", "rise-up": "rise", "fade-in": "fade", typewriter: "typewriter", zoom: "pop" };
const PM: Record<TemplateSlide["photo_motion"], NonNullable<Frame["photo"]["movement"]>> = { none: "none", "slow-zoom-in": "slow_zoom_in", pan: "pan_left" };

/** Renderable frames for a doc: the same settings new ads start from. */
export function framesFromDoc(doc: TemplateDoc, { samples = false } = {}): Frame[] {
  const st = doc.style;
  const under = st.text_position.startsWith("top") || st.text_position.startsWith("middle") || st.text_position === "center";
  return doc.slides.map((s, i) => ({
    id: `f${i}`,
    project_id: "",
    sort_order: i,
    duration_sec: s.duration_sec,
    logo_visible: s.logo_visible ?? true,
    logo_variant: s.logo_variant ?? null,
    transition_in: { type: i === 0 ? "cut" : TR[s.transition_in], speed: s.transition_speed ?? (s.transition_in === "cut" ? "quick" : "smooth") },
    photo: {
      fit: "fill",
      focus: s.photo_focus ?? { x: 0.5, y: 0.5 },
      zoom: s.photo_zoom ?? 1,
      movement: PM[s.photo_motion],
      brightness: 0,
      darken_for_text: false,
      background_color: s.photo_background_color ?? st.background_color,
      ...(samples && s.sample_photo ? { path: s.sample_photo } : {}),
    },
    headline: {
      text: s.headline_placeholder,
      color: s.headline_style?.color ?? st.headline.color,
      size_px: s.headline_style?.size_px ?? st.headline.size_px,
      font_family: s.headline_style?.font_family ?? st.headline.font,
      font_weight: s.headline_style?.font_weight ?? st.headline.weight,
      position: s.headline_style?.position ?? st.text_position,
      animation: s.headline_style?.animation ?? TA[s.text_animation],
      same_on_all: false,
    },
    subline: s.subline_placeholder
      ? {
          text: s.subline_placeholder,
          color: s.subline_style?.color ?? st.subline.color,
          size_px: s.subline_style?.size_px ?? st.subline.size_px,
          font_family: s.subline_style?.font_family ?? st.subline.font,
          font_weight: s.subline_style?.font_weight ?? st.subline.weight ?? 500,
          position: s.subline_style?.position ?? (under ? st.text_position : "bottom-center"),
          animation: s.subline_style?.animation ?? TA[s.text_animation],
          same_on_all: false,
          keep_under_headline: s.subline_style?.keep_under_headline ?? true,
        }
      : null,
  }));
}

export function settingsFromDoc(doc: TemplateDoc): TemplateSettings {
  return {
    ad_title: doc.ad_title?.trim() || null,
    formats: [doc.format],
    primary_format: doc.format,
    pace: "standard",
    logo: { path: doc.style.logo_path ?? null, size_pct: doc.style.logo_size_pct ?? 16, opacity: doc.style.logo_opacity ?? "solid", show_on: doc.style.logo_show_on ?? "all", version: doc.style.logo_version ?? "auto", positions: { [doc.format]: doc.style.logo_position } },
    end_card: {},
    frame_count: doc.slides.length,
    frames: framesFromDoc(doc).map(({ id: _i, project_id: _p, sort_order: _s, ...f }) => f),
  } as TemplateSettings;
}

/** A throwaway project for drawing a doc through renderAt. Slides with preview:false are left out. */
/** `allSlides` keeps hidden slides; `samples: false` leaves photos empty (customer's own ad). */
export function previewProject(doc: TemplateDoc, { allSlides = false, samples = true } = {}): ProjectWithFrames {
  const shown = allSlides ? doc.slides : doc.slides.filter((s) => s.preview !== false);
  const previewDoc = shown.length === doc.slides.length ? doc : { ...doc, slides: shown.length ? shown : doc.slides };
  const now = new Date().toISOString();
  return {
    id: "preview",
    workspace_id: "",
    name: doc.name,
    primary_format: doc.format,
    formats: [doc.format],
    pace: "standard",
    logo: { ...DEFAULT_LOGO, path: doc.style.logo_path ?? null, size_pct: doc.style.logo_size_pct ?? 16, opacity: doc.style.logo_opacity ?? "solid", show_on: doc.style.logo_show_on ?? "all", version: doc.style.logo_version ?? "auto", positions: { "9:16": doc.style.logo_position, "4:5": doc.style.logo_position, "1:1": doc.style.logo_position, "16:9": doc.style.logo_position } },
    end_card: {},
    is_template: false,
    deleted_at: null,
    thumbnail_url: null,
    created_at: now,
    updated_at: now,
    frames: framesFromDoc(previewDoc, { samples }),
  };
}

export const docDuration = (d: Pick<TemplateDoc, "slides">) => d.slides.reduce((a, s) => a + s.duration_sec, 0);
export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
