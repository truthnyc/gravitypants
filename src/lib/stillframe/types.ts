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
  path?: string | null;
  light_path?: string | null;
  dark_path?: string | null;
  version?: "auto" | "light" | "dark";
  size_pct?: number;
  opacity?: "solid" | "soft";
  show_on?: "all" | "first_last" | "selected";
  positions?: Partial<Record<Format, LogoPosition | string>>;
  /** updated_at of the brand kit last applied, so later kit edits flow into the ad. */
  kit_stamp?: string | null;
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
  /** extra crop zoom for Fill, 1..3 */
  zoom?: number;
  movement?: "none" | "slow_zoom_in" | "slow_zoom_out" | "pan_left" | "pan_right" | "custom";
  /** how much the preset movement travels */
  movement_intensity?: "subtle" | "standard" | "dramatic";
  /** custom movement: zoom at the start / end of the frame, 1..1.5 */
  zoom_start?: number;
  zoom_end?: number;
  /** custom movement: sideways / vertical travel, -1..1 */
  pan_x?: number;
  pan_y?: number;
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
  /** Optional logo artwork override for this frame; falls back to the ad setting. */
  logo_variant?: "auto" | "light" | "dark" | null;
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
  brand_kit_id?: string | null;
  /** Reusable template kit this ad was made from. */
  template_id?: string | null;
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

/** Ad text colors are content, not UI chrome. Used when the Brand Kit has none. */
export const TEXT_COLORS = ["#FFFFFF", "#1D1D1F", "#FFD60A", "#FF6B4A", "#0071E3", "#7D3BD6"];

export type BrandLogoRole = "primary" | "reversed" | "icon" | "other";
export type BrandLogo = { id: string; path: string; name: string; role: BrandLogoRole };
export type CustomFont = { family: string; path: string };

export type BrandKit = {
  id: string;
  workspace_id: string;
  logos: BrandLogo[];
  colors: string[];
  headline_font: string | null;
  body_font: string | null;
  default_logo_positions: Partial<Record<Format, string>>;
  logo_size_pct: number;
  end_card: EndCard;
  custom_fonts: CustomFont[];
};

export const PACE_SECONDS: Record<Pace, number> = { relaxed: 3.5, standard: 2.5, fast: 1.5 };

/** A named, shareable brand kit (brand_kits table). Logos are brand-assets paths. */
export type NamedBrandKit = {
  id: string;
  workspace_id: string;
  name: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  colors: string[];
  headline_font: string | null;
  subline_font: string | null;
  is_default: boolean;
  created_by: string | null;
  updated_at: string;
};
