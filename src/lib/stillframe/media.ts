import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceId } from "./workspace";

export const MEDIA_BUCKET = "media";
export const BRAND_BUCKET = "brand-assets";
/** Paths stored with this prefix live in the brand-assets bucket; everything else is in media. */
export const BRAND_PREFIX = "brand-assets:";

/** Uploads a brand kit logo (images only, max 5 MB) and returns its stored path. */
export async function uploadBrandAsset(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (PNG, SVG, JPG or WebP).");
  if (file.size > 5 * 1024 * 1024) throw new Error("That image is over 5 MB. Choose a smaller one.");
  const extByType: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif" };
  const ext = extByType[file.type];
  if (!ext) throw new Error("Choose a PNG, SVG, JPG, WebP or GIF image.");
  const base = file.name.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "logo";
  const key = `${getWorkspaceId()}/${crypto.randomUUID()}-${base}.${ext}`;
  const { error } = await supabase.storage.from(BRAND_BUCKET).upload(key, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) {
    console.error("Brand logo upload failed", error);
    throw new Error("That logo couldn't be uploaded. Try again.");
  }
  return BRAND_PREFIX + key;
}

export function clearMediaCache() {
  signedUrlCache.clear();
}

const signedUrlCache = new Map<string, { url: string; expires: number }>();

/** Signed URL for a private media path; cached until shortly before expiry. */
export async function getMediaUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;

  const [bucket, key] = path.startsWith(BRAND_PREFIX) ? [BRAND_BUCKET, path.slice(BRAND_PREFIX.length)] : [MEDIA_BUCKET, path];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 3600);
  if (error || !data) return null;
  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export type UploadedPhoto = {
  assetId: string;
  path: string;
  url: string | null;
  width: number;
  height: number;
  name: string;
};

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadMedia(
  file: File,
  kind: "photo" | "logo" | "font" = "photo",
): Promise<UploadedPhoto> {
  const path = `${getWorkspaceId()}/${kind}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const size = kind === "font" ? { width: 0, height: 0 } : await readImageSize(file);
  const { data, error } = await supabase
    .from("assets")
    .insert({
      workspace_id: getWorkspaceId(),
      kind,
      url: path,
      width: size.width,
      height: size.height,
      name: file.name,
    })
    .select("id")
    .single();
  if (error) throw error;

  return {
    assetId: data.id,
    path,
    url: await getMediaUrl(path),
    width: size.width,
    height: size.height,
    name: file.name,
  };
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function isAcceptedImage(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|heic)$/i.test(file.name);
}
