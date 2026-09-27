import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGoogleFonts, type WebFont } from "./fonts.functions";
import { getMediaUrl } from "./media";
import type { CustomFont } from "./types";

export type { WebFont };
export type FontCategory = "all" | "sans-serif" | "serif" | "display" | "handwriting";

const v = (...w: number[]) => w.map((n) => (n === 400 ? "regular" : String(n)));

/** Used when the live list isn't available (no API key yet). Ordered by popularity. */
export const FALLBACK_FONTS: WebFont[] = [
  ["Roboto", "sans-serif", v(100, 300, 400, 500, 700, 900)],
  ["Open Sans", "sans-serif", v(300, 400, 500, 600, 700, 800)],
  ["Montserrat", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["Poppins", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["Lato", "sans-serif", v(100, 300, 400, 700, 900)],
  ["Inter", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["DM Sans", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["Oswald", "sans-serif", v(200, 300, 400, 500, 600, 700)],
  ["Raleway", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["Nunito", "sans-serif", v(200, 300, 400, 500, 600, 700, 800, 900)],
  ["Playfair Display", "serif", v(400, 500, 600, 700, 800, 900)],
  ["Merriweather", "serif", v(300, 400, 700, 900)],
  ["Rubik", "sans-serif", v(300, 400, 500, 600, 700, 800, 900)],
  ["Work Sans", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["Space Grotesk", "sans-serif", v(300, 400, 500, 600, 700)],
  ["Manrope", "sans-serif", v(200, 300, 400, 500, 600, 700, 800)],
  ["Lora", "serif", v(400, 500, 600, 700)],
  ["Libre Baskerville", "serif", v(400, 700)],
  ["Fraunces", "serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["DM Serif Display", "serif", v(400)],
  ["Cormorant Garamond", "serif", v(300, 400, 500, 600, 700)],
  ["EB Garamond", "serif", v(400, 500, 600, 700, 800)],
  ["Bebas Neue", "display", v(400)],
  ["Anton", "sans-serif", v(400)],
  ["Archivo Black", "sans-serif", v(400)],
  ["Abril Fatface", "display", v(400)],
  ["Lobster", "display", v(400)],
  ["Righteous", "display", v(400)],
  ["Bungee", "display", v(400)],
  ["Alfa Slab One", "display", v(400)],
  ["Syne", "sans-serif", v(400, 500, 600, 700, 800)],
  ["Outfit", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["Sora", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800)],
  ["Barlow", "sans-serif", v(100, 200, 300, 400, 500, 600, 700, 800, 900)],
  ["Josefin Sans", "sans-serif", v(100, 200, 300, 400, 500, 600, 700)],
  ["Pacifico", "handwriting", v(400)],
  ["Dancing Script", "handwriting", v(400, 500, 600, 700)],
  ["Caveat", "handwriting", v(400, 500, 600, 700)],
  ["Satisfy", "handwriting", v(400)],
  ["Great Vibes", "handwriting", v(400)],
  ["Permanent Marker", "handwriting", v(400)],
  ["Shadows Into Light", "handwriting", v(400)],
].map(([family, category, variants]) => ({ family: family as string, category: category as string, variants: variants as string[] }));

export const POPULAR = ["DM Sans", "Inter", "Montserrat", "Poppins", "Playfair Display", "Bebas Neue", "Fraunces", "Space Grotesk"];

export function useFontList() {
  const fetchFonts = useServerFn(listGoogleFonts);
  return useQuery({
    queryKey: ["google-fonts"],
    queryFn: () => fetchFonts(),
    staleTime: 24 * 60 * 60 * 1000,
    select: (r) => (r.fonts.length ? r : { fonts: FALLBACK_FONTS, live: false }),
  });
}

/** Numeric upright weights available for a font. */
export function weightsOf(font: Pick<WebFont, "variants"> | undefined): number[] {
  if (!font) return [400, 700];
  const ws = new Set<number>();
  for (const v of font.variants) {
    if (v === "regular") ws.add(400);
    else if (/^\d+$/.test(v)) ws.add(Number(v));
  }
  const out = [...ws].sort((a, b) => a - b);
  return out.length ? out : [400];
}

export const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

export function closestWeight(ws: number[], w: number) {
  return ws.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), ws[0] ?? 400);
}

const CATEGORY_LABEL: Record<string, string> = {
  "sans-serif": "Sans",
  serif: "Serif",
  display: "Display",
  handwriting: "Handwriting",
  monospace: "Mono",
  custom: "Uploaded",
};
export const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;

const loaded = new Set<string>();
function addLink(href: string) {
  if (typeof document === "undefined" || loaded.has(href)) return;
  loaded.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/** Tiny stylesheet with just the glyphs of the family name, for list previews. */
export function loadFontPreview(family: string) {
  if (customFamilies.has(family)) return;
  addLink(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(family)}&display=swap`);
}

/** Full stylesheet for one weight, then wait until the browser has the face. */
export async function loadFont(family: string, weight: number) {
  if (typeof document === "undefined") return;
  if (!customFamilies.has(family)) {
    addLink(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`);
  }
  // the stylesheet itself needs a moment to arrive before fonts.load can see the face
  for (let i = 0; i < 20; i++) {
    const faces = await document.fonts.load(`${weight} 48px "${family}"`).catch(() => []);
    if (faces.length) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

const customFamilies = new Set<string>();
/** Registers uploaded fonts (from the Brand Kit) with @font-face. */
export async function registerCustomFonts(fonts: CustomFont[]) {
  if (typeof document === "undefined") return;
  await Promise.all(
    fonts.map(async (f) => {
      if (customFamilies.has(f.family)) return;
      customFamilies.add(f.family);
      const url = await getMediaUrl(f.path);
      if (!url) return;
      const face = new FontFace(f.family, `url(${url})`);
      try {
        await face.load();
        document.fonts.add(face);
      } catch {
        customFamilies.delete(f.family);
      }
    }),
  );
}
