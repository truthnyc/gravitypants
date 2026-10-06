import { z } from "zod";

export const MOOD_FAMILIES = ["Calm", "Luxe", "Warm", "Energetic", "Playful", "Natural", "Romantic", "Dramatic", "Modern", "Heartfelt", "Festive"] as const;
export const moodInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().toLowerCase().min(2).max(30),
  family: z.enum(MOOD_FAMILIES),
});