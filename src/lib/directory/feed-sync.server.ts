import { ProductFetchError, safeFetchText } from "./product-fetch.server";
import { parseFeed, type FeedItem } from "./product-feed";

/* eslint-disable @typescript-eslint/no-explicit-any */

const FEED_MAX_BYTES = 20 * 1024 * 1024;

/** Downloads and reads a feed; throws a short plain-language error. Saves nothing. */
export async function readFeed(url: string, timeoutMs = 20000): Promise<FeedItem[]> {
  const { text } = await safeFetchText(url, { timeoutMs, maxBytes: FEED_MAX_BYTES, truncate: false, accept: "application/xml,text/xml,text/tab-separated-values,text/csv,text/plain,*/*" });
  const items = parseFeed(text);
  if (!items.length) throw new ProductFetchError("No products found. Check that this is a Google Shopping product feed.");
  return items;
}

/**
 * Syncs one source with the service client (caller must already be authorised).
 * The catalogue only changes after the whole feed was read, so a failure leaves it as it was.
 */
export async function syncSource(db: any, sourceId: string, timeoutMs?: number): Promise<{ ok: boolean; count: number; error?: string }> {
  const { data: src } = await db.from("brand_sources").select("id, brand_id, feed_url").eq("id", sourceId).maybeSingle();
  if (!src) return { ok: false, count: 0, error: "Feed not found." };
  await db.from("brand_sources").update({ status: "syncing" }).eq("id", src.id);
  let items: FeedItem[];
  try { items = await readFeed(src.feed_url, timeoutMs); }
  catch (e) {
    const error = e instanceof ProductFetchError ? e.message : "We couldn't read this feed.";
    await db.from("brand_sources").update({ status: "error", last_error: error.slice(0, 200) }).eq("id", src.id);
    return { ok: false, count: 0, error };
  }
  const now = new Date().toISOString();
  for (let i = 0; i < items.length; i += 500) {
    const rows = items.slice(i, i + 500).map((it) => ({ ...it, source_id: src.id, brand_id: src.brand_id, updated_at: now }));
    const { error } = await db.from("brand_catalog").upsert(rows, { onConflict: "source_id,external_id" });
    if (error) {
      await db.from("brand_sources").update({ status: "error", last_error: "Saving the catalogue failed. Try again." }).eq("id", src.id);
      return { ok: false, count: 0, error: "Saving the catalogue failed. Try again." };
    }
  }
  // Anything not seen in this run left the feed: keep it, marked out of stock.
  await db.from("brand_catalog").update({ availability: "out_of_stock", updated_at: now }).eq("source_id", src.id).lt("updated_at", now);
  // Copy current values onto reel products picked from this catalogue.
  const { data: linked } = await db.from("reel_products").select("id, catalog_id, brand_catalog!inner(source_id, price, currency, availability)").eq("brand_catalog.source_id", src.id);
  for (const r of linked ?? []) {
    const c = r.brand_catalog;
    await db.from("reel_products").update({ price: c.price, currency: c.currency, availability: c.availability, last_synced_at: now, sync_failures: 0 }).eq("id", r.id);
  }
  await db.from("brand_sources").update({ status: "ok", last_error: null, last_synced_at: now, product_count: items.length }).eq("id", src.id);
  return { ok: true, count: items.length };
}
