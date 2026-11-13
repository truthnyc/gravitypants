import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

/** ?categories=a|b narrows, ?start=<reelId> picks the first reel, ?seed= keeps the Directory grid's order. */
export const stageSearch = zodValidator(z.object({
  categories: fallback(z.string(), "").optional(),
  start: fallback(z.string(), "").optional(),
  seed: fallback(z.string(), "").optional(),
}));
export const stageCategories = (s: string | undefined) => (s ?? "").split("|").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 20);
