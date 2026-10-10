import type { Format, Frame, FrameVisualSettings, LogoSettings, PhotoSettings, Project, TextSettings } from "./types";

export const REEL_FORMATS: Format[] = ["9:16", "4:5", "1:1", "16:9"];
const MOTION_KEYS = new Set(["movement", "movement_intensity", "zoom_start", "zoom_end", "pan_x", "pan_y"]);

export function frameForFormat(frame: Frame, format: Format): Frame {
  const { format_overrides, ...base } = frame;
  const own = format_overrides?.[format];
  if (!own) return base;
  const text = (el: "headline" | "subline") => {
    if (own[el] === null) return null;
    if (!own[el]) return base[el];
    return { ...base[el], ...own[el], animation: base[el]?.animation ?? "none" };
  };
  const visualPhoto = Object.fromEntries(Object.entries(own.photo ?? {}).filter(([k]) => !MOTION_KEYS.has(k)));
  return { ...base, photo: { ...base.photo, ...visualPhoto }, headline: text("headline"), subline: text("subline"),
    logo_visible: own.logo_visible ?? base.logo_visible, logo_variant: own.logo_variant ?? base.logo_variant };
}

export function projectForFormat(project: Project, format: Format): Project {
  const { format_overrides, ...logo } = project.logo;
  return { ...project, logo: { ...logo, ...format_overrides?.[format] } };
}

export function patchPhotoForFormat(frame: Frame, format: Format, patch: Partial<PhotoSettings>): Frame {
  const motion = Object.fromEntries(Object.entries(patch).filter(([k]) => MOTION_KEYS.has(k)));
  const visual = Object.fromEntries(Object.entries(patch).filter(([k]) => !MOTION_KEYS.has(k)));
  const own = frame.format_overrides?.[format] ?? {};
  return { ...frame, photo: { ...frame.photo, ...motion }, format_overrides: {
    ...frame.format_overrides, [format]: { ...own, photo: { ...own.photo, ...visual } },
  } };
}

export function patchTextForFormat(frame: Frame, format: Format, el: "headline" | "subline", patch: Partial<TextSettings>): Frame {
  const { animation, ...visual } = patch;
  const own = frame.format_overrides?.[format] ?? {};
  return { ...frame, ...(animation !== undefined ? { [el]: { ...frame[el], animation } } : {}),
    format_overrides: { ...frame.format_overrides, [format]: { ...own, [el]: { ...own[el], ...visual } } } };
}

export function patchFrameVisual(frame: Frame, format: Format, patch: FrameVisualSettings): Frame {
  return { ...frame, format_overrides: { ...frame.format_overrides, [format]: { ...frame.format_overrides?.[format], ...patch } } };
}

export function patchLogoForFormat(project: Project, format: Format, patch: Partial<LogoSettings>): Project {
  const { positions, frame_positions, kit_stamp, format_overrides: _ignored, ...visual } = patch;
  const logo = project.logo;
  return { ...project, logo: { ...logo,
    ...(positions ? { positions } : {}), ...(frame_positions ? { frame_positions } : {}),
    ...(kit_stamp !== undefined ? { kit_stamp } : {}),
    format_overrides: { ...logo.format_overrides, [format]: { ...logo.format_overrides?.[format], ...visual } },
  } };
}

export function allFormatFrames(frames: Frame[]): Frame[] {
  return frames.flatMap((f) => [f, ...REEL_FORMATS.map((format) => frameForFormat(f, format))]);
}