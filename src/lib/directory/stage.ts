import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

/** ?categories=a|b narrows, ?start=<reelId> picks the first reel, ?seed= keeps the Directory grid's order, ?family=warm plays a whole mood family. */
export const stageSearch = zodValidator(z.object({
  categories: fallback(z.string(), "").optional(),
  start: fallback(z.string(), "").optional(),
  seed: fallback(z.string(), "").optional(),
  family: fallback(z.string(), "").optional(),
  q: fallback(z.string(), "").optional(),
  brands: fallback(z.string(), "").optional(),
  moods: fallback(z.string(), "").optional(),
}));
export const stageCategories = (s: string | undefined) => (s ?? "").split("|").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 20);

export const stageFilters = (s: { q?: string; brands?: string; moods?: string }) => ({
  q: (s.q ?? "").slice(0, 200),
  brands: stageCategories(s.brands),
  moods: (s.moods ?? "").split("|").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 60),
});

/** Keep the entire filtered order, including a selected reel beyond the first page. */
export async function stagePages<T>(fetchPage: (page: number) => Promise<{ reels: T[]; hasMore: boolean }>): Promise<T[]> {
  const reels: T[] = [];
  for (let page = 1; page <= 1000; page++) {
    const result = await fetchPage(page);
    reels.push(...result.reels);
    if (!result.hasMore || !result.reels.length) break;
  }
  return reels;
}
