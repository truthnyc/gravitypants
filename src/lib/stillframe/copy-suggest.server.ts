import { gatewayText } from "@/lib/ai/gateway.server";

export type CopySubject = {
  part: "headline" | "subline";
  brand: string;
  format: string;
  imageUrl: string | null;
  headline?: string;
  current?: string;
  others: string[];
  hint?: string;
};

/** Word limits per part, kept short so lines fit square and portrait frames. */
export const COPY_WORDS = { headline: { min: 2, max: 6 }, subline: { min: 4, max: 10 } } as const;

/** Asks the AI for three short ad lines. Never invents prices, discounts or facts it can't see. */
export async function writeCopy(s: CopySubject): Promise<string[]> {
  const w = COPY_WORDS[s.part];
  const system = [
    `You write the ${s.part} for one frame of a short social video ad.`,
    `Write 3 different options, each ${w.min} to ${w.max} words. Plain, warm, confident. No emoji, no hashtags, no quotation marks.`,
    "Never mention prices, discounts, sales, percentages, materials, awards or other facts that are not visible in the photo or given below.",
    s.part === "subline" ? "The subline sits under the headline and adds to it; don't repeat its words." : "",
    "If other frames are listed, make this frame fit their story without repeating them.",
    'Reply with JSON only, like {"options":["...","...","..."]}.',
  ].filter(Boolean).join("\n");
  const lines = [
    `Brand: ${s.brand}`,
    `Ad size: ${s.format}`,
    s.part === "subline" && s.headline ? `Headline on this frame: ${s.headline}` : "",
    s.current ? `Current ${s.part} (write something different): ${s.current}` : "",
    s.others.length ? `Text on other frames: ${s.others.join(" | ")}` : "",
    s.hint ? `Direction from the user: ${s.hint}` : "",
    s.imageUrl ? "The frame's photo is attached." : "This frame has no photo, only a colour background.",
  ].filter(Boolean).join("\n");
  const content = s.imageUrl
    ? [{ type: "text" as const, text: lines }, { type: "image" as const, image: new URL(s.imageUrl) }]
    : lines;
  const text = await gatewayText(system, [{ role: "user", content }]);
  return parseOptions(text, w.max);
}

/** Pull clean, short, distinct options out of the model reply. */
export function parseOptions(text: string, maxWords: number): string[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(match[0]); } catch { return []; }
  const raw = (parsed as { options?: unknown })?.options;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const line = String(r).replace(/["“”#]/g, "").replace(/\s+/g, " ").trim();
    if (!line || line.split(" ").length > maxWords + 2 || seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    out.push(line);
  }
  return out.slice(0, 3);
}
