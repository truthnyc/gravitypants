export const REEL_PRODUCTS_MAX = 4;

export type ReelProduct = { id: string; reel_id: string | null; site_reel_id?: string | null; name: string; price: number | null; currency: string; url: string; image_path: string | null; image_url?: string | null; position: number; source_type?: "manual" | "link" | "feed"; availability?: "in_stock" | "out_of_stock" | "unknown"; last_synced_at?: string | null; sync_failures?: number; catalog_id?: string | null };

export function isHttpsUrl(v: string): boolean {
  try { return new URL(v.trim()).protocol === "https:"; } catch { return false; }
}

/** Brand website link tagged as Aimanté traffic; keeps the brand's own query and fragment. */
export function aimanteHref(url: string, campaign: string | null = null): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return url;
    u.searchParams.set("utm_source", "aimante");
    u.searchParams.set("utm_medium", "directory");
    if (campaign) u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch { return url; }
}

/** Product link with Aimanté tracking; keeps the brand's own query and fragment. */
export function productHref(url: string, reelId: string | null): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "aimante");
  u.searchParams.set("utm_medium", "directory");
  if (reelId) u.searchParams.set("utm_campaign", reelId);
  return u.toString();
}

export function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price); } catch { return `${price} ${currency}`; }
}
