export const REEL_PRODUCTS_MAX = 4;

export type ReelProduct = { id: string; reel_id: string; name: string; price: number | null; currency: string; url: string; image_path: string | null; position: number };

export function isHttpsUrl(v: string): boolean {
  try { return new URL(v.trim()).protocol === "https:"; } catch { return false; }
}

/** Product link with Aimanté tracking; keeps the brand's own query and fragment. */
export function productHref(url: string, reelId: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "aimante");
  u.searchParams.set("utm_medium", "directory");
  u.searchParams.set("utm_campaign", reelId);
  return u.toString();
}

export function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price); } catch { return `${price} ${currency}`; }
}
