import { z } from "zod";

export const MOOD_FAMILIES = ["Calm", "Luxe", "Warm", "Energetic", "Playful", "Natural", "Romantic", "Dramatic", "Modern", "Heartfelt", "Festive"] as const;
export const moodInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().toLowerCase().min(2).max(30),
  family: z.enum(MOOD_FAMILIES),
});
export type MoodFamily = (typeof MOOD_FAMILIES)[number];
/** One colour per mood family, shared by the site and admin. `ink` is the readable text colour on it. */
export const MOOD_FAMILY_COLORS: Record<MoodFamily, { bg: string; ink: "light" | "dark" }> = {
  Calm: { bg: "#7fa7cf", ink: "light" }, Luxe: { bg: "#b8955a", ink: "light" }, Warm: { bg: "#c9733f", ink: "light" },
  Energetic: { bg: "#e8562a", ink: "light" }, Playful: { bg: "#e6a700", ink: "dark" }, Natural: { bg: "#5c8a4e", ink: "light" },
  Romantic: { bg: "#c96b85", ink: "light" }, Dramatic: { bg: "#4b3d63", ink: "light" }, Modern: { bg: "#4f5b6b", ink: "light" },
  Heartfelt: { bg: "#d0585e", ink: "light" }, Festive: { bg: "#c79a12", ink: "dark" },
};
