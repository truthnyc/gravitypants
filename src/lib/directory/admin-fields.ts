import { z } from "zod";
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX, BRAND_MOODS_MAX, CATEGORIES } from "./directory";

export const brandPublicationFields = {
  affiliated: z.boolean().optional(),
  status: z.enum(["draft", "live"]).optional(),
};
export const createBrandInput = z.object({
  name: z.string().trim().min(1).max(BRAND_NAME_MAX),
  website: z.string().trim().max(200).refine((v) => !v || /^https?:\/\//.test(v), "Website must start with http:// or https://"),
  category: z.enum(CATEGORIES), description: z.string().trim().max(BRAND_DESCRIPTION_MAX),
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  workspaceId: z.string().uuid().nullable(),
  siteReelIds: z.array(z.string().uuid()).max(100),
  moods: z.array(z.string().trim().toLowerCase().max(30)).max(BRAND_MOODS_MAX).default([]),
  affiliated: brandPublicationFields.affiliated.default(false), status: brandPublicationFields.status.default("live"),
});
export const categoryHintInput = z.object({ id: z.string().uuid(), hint: z.string().trim().min(1).max(120) });
export const greetingEventInput = z.object({
  session_id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  rule: z.enum(["campaign", "countdown", "fun_day", "weather", "season", "returning", "time_of_day", "day_of_week", "fallback"]),
  greeting: z.string().max(80),
  action: z.enum(["shown", "mood_click", "filter"]),
});