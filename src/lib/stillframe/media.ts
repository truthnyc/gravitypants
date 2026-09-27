import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceId } from "./workspace";

export const MEDIA_BUCKET = "media";

export function clearMediaCache() {
  signedUrlCache.clear();
}

const signedUrlCache = new Map<string, { url: string; expires: number }>();

/** Signed URL for a private media path; cached until shortly before expiry. */
export async function getMediaUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
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
