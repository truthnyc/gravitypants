/**
 * Live stats for the aimante.co /c/ and /mood/ pages: how many brands each one shows
 * (same server search the page uses) and when its reels last changed. Pages with fewer
 * than MIN_LISTING_BRANDS brands are left out of the sitemap and carry noindex.
 */
import { categorySlug as toSlug } from "./directory";

import { brandCount } from "./listing";
export { MIN_LISTING_BRANDS } from "./listing";

type Listing = { kind: "category" | "mood"; slug: string; brands: number; lastmod: string };

export async function listingStats(): Promise<Listing[]> {
  const { publicClient } = await import("@/lib/site/reels.server");
  const pc = publicClient() as any;
  const [{ data: cats }, { data: moods }, { data: dreels }, { data: sreels }] = await Promise.all([
    pc.from("categories").select("slug, name"),
    pc.from("moods").select("name"),
    pc.from("directory_reels").select("published_at, updated_at, moods, directory_brands!inner(category, moods, status)").eq("status", "live"),
    pc.from("site_reels").select("updated_at, created_at, category, moods").eq("published", true),
  ]);
  const dated: { cat: string; moods: string[]; at: string }[] = [
    ...((dreels ?? []) as any[]).map((r) => ({ cat: toSlug(r.directory_brands?.category ?? ""), moods: [...(r.moods ?? []), ...(r.directory_brands?.moods ?? [])].map((m: string) => m.toLowerCase()), at: r.published_at ?? r.updated_at })),
    ...((sreels ?? []) as any[]).map((r) => ({ cat: toSlug(r.category ?? ""), moods: (r.moods ?? []).map((m: string) => m.toLowerCase()), at: r.updated_at ?? r.created_at })),
  ];
  const latest = (rows: typeof dated) => rows.reduce((m, r) => (r.at && r.at > m ? r.at : m), "").slice(0, 10);
  const count = async (f: { f_categories: string[]; f_moods: string[] }) => {
    const { data } = await pc.rpc("directory_faceted_search", { q: "", f_brands: [], page: 1, page_size: 1, ...f });
    return brandCount({ brands: (data as any)?.brands ?? (data as any)?.facets?.brands ?? {} });
  };
  const out: Listing[] = [];
  for (const c of (cats ?? []) as { slug: string }[]) {
    out.push({ kind: "category", slug: c.slug, brands: await count({ f_categories: [c.slug], f_moods: [] }), lastmod: latest(dated.filter((r) => r.cat === c.slug)) });
  }
  for (const m of (moods ?? []) as { name: string }[]) {
    const slug = m.name.toLowerCase();
    out.push({ kind: "mood", slug, brands: await count({ f_categories: [], f_moods: [slug] }), lastmod: latest(dated.filter((r) => r.moods.includes(slug))) });
  }
  return out;
}
