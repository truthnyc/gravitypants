import { getMediaUrl } from "@/lib/stillframe/media";

const cache = new Map<string, Promise<HTMLImageElement | null>>();

/** Loads a private media path as a CORS-clean image (so canvas pixels stay readable). */
export function loadImage(path: string): Promise<HTMLImageElement | null> {
  let p = cache.get(path);
  if (!p) {
    p = getMediaUrl(path).then(
      (url) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          if (!url) return resolve(null);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        }),
    );
    cache.set(path, p);
  }
  return p;
}

export async function loadImages(paths: string[]) {
  const map = new Map<string, HTMLImageElement>();
  const loaded = await Promise.all(paths.map((p) => loadImage(p)));
  loaded.forEach((img, i) => {
    const path = paths[i];
    if (img && path) map.set(path, img);
  });
  return map;
}
