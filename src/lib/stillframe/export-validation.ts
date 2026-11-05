import type { PhotoSettings } from "./types";

/** A deliberate background-only frame does not need a photo asset. */
export function hasExportableBackground(photo: PhotoSettings | null | undefined): boolean {
  if (photo?.path) return true;
  if (photo?.background === "solid") return true;
  return photo?.background === "gradient" && !!photo.background_gradient?.every((color) => color.trim().length > 0);
}