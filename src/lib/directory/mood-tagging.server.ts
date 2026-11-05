import { gatewayText } from "@/lib/ai/gateway.server";

export type MoodSubject = { brand: string; category: string; title?: string | null; description?: string | null; tags?: string[]; brandMoods?: string[] };

/** Asks the AI which moods from the master list fit. Only names from `catalog` are ever returned. */
export async function pickMoods(subject: MoodSubject, catalog: string[], count: { min: number; max: number }): Promise<string[]> {
  const system = [
    "You tag short product video ads with moods for a brand discovery site.",
    `Choose between ${count.min} and ${count.max} moods that genuinely fit, using ONLY names from this list: ${catalog.join(", ")}.`,
    "Base your choice mainly on the title and description: what the product or place actually is and how it feels. Tags can be wrong or copied from another reel; ignore any tag that contradicts the description. Only pick a mood a shopper would clearly recognise in this reel; fewer accurate moods are better than many loose ones.",
    'Reply with JSON only, like {"moods":["cozy","elegant"]}. No other text.',
  ].join("\n");
  const lines = [
    `Brand: ${subject.brand}`,
    `Category: ${subject.category}`,
    subject.title ? `Title: ${subject.title}` : "",
    subject.description ? `Description: ${subject.description}` : "",
    subject.tags?.length ? `Tags: ${subject.tags.join(", ")}` : "",
    subject.brandMoods?.length ? `Brand moods: ${subject.brandMoods.join(", ")}` : "",
  ].filter(Boolean);
  const text = await gatewayText(system, [{ role: "user", content: lines.join("\n") }]);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(match[0]); } catch { return []; }
  const raw = (parsed as { moods?: unknown })?.moods;
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(catalog);
  return [...new Set(raw.map((m) => String(m).trim().toLowerCase()).filter((m) => allowed.has(m)))].slice(0, count.max);
}
