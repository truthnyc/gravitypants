export const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

export type Format = "9:16" | "1:1" | "16:9";
export type Pace = "relaxed" | "standard" | "fast";
export type LogoPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type LogoSettings = {
  asset_id?: string | null;
  version?: "auto" | "light" | "dark";
  size_pct?: number;
  opacity?: "solid" | "soft";
  show_on?: "all" | "first_last" | "selected";
  positions?: Partial<Record<Format, LogoPosition>>;
};

export type EndCard = {
  enabled?: boolean;
  cta_text?: string;
};

export type PhotoSettings = {
  asset_id?: string | null;
  path?: string | null;
  url?: string | null;
  fit?: "fill" | "fit";
  focus?: { x: number; y: number };
  movement?: "none" | "slow_zoom_in" | "slow_zoom_out" | "pan_left" | "pan_right";
  brightness?: number;
  darken_for_text?: boolean;
  background_color?: string | null;
};

export type TransitionSettings = {
  type: "cut" | "fade" | "slide" | "zoom" | "wipe" | "dip_black";
  speed: "smooth" | "quick";
};

export type TextSettings = {
  text?: string;
  font_family?: string | null;
  font_weight?: number | null;
  size_px?: number;
  color?: string;
  animation?: "none" | "rise" | "fade" | "pop" | "typewriter";
  position?: string;
  same_on_all?: boolean;
  keep_under_headline?: boolean;
};

export type Frame = {
  id: string;
  project_id: string;
  sort_order: number;
  duration_sec: number;
  photo: PhotoSettings;
  transition_in: TransitionSettings;
  headline: TextSettings | null;
  subline: TextSettings | null;
  logo_visible: boolean;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  primary_format: Format;
  formats: Format[];
  pace: Pace;
  logo: LogoSettings;
  end_card: EndCard;
  is_template: boolean;
  deleted_at: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectWithFrames = Project & { frames: Frame[] };

export const DEFAULT_LOGO: LogoSettings = {
  asset_id: null,
  version: "auto",
  size_pct: 16,
  opacity: "solid",
  show_on: "all",
  positions: { "9:16": "top-right", "1:1": "top-right", "16:9": "bottom-right" },
};

export const FORMAT_RATIO: Record<Format, number> = {
  "9:16": 9 / 16,
  "1:1": 1,
  "16:9": 16 / 9,
};

export function formatSeconds(totalSeconds: number) {
  const rounded = Math.round(totalSeconds * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}
