import { z } from "zod";

export const brandPublicationFields = {
  affiliated: z.boolean().optional(),
  status: z.enum(["draft", "live"]).optional(),
};
export const categoryHintInput = z.object({ id: z.string().uuid(), hint: z.string().trim().min(1).max(120) });
export const greetingEventInput = z.object({
  session_id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  rule: z.enum(["campaign", "countdown", "fun_day", "weather", "season", "returning", "time_of_day", "day_of_week", "fallback"]),
  greeting: z.string().max(80),
  action: z.enum(["shown", "mood_click", "filter"]),
});