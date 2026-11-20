export const MAX_KEYWORDS = 20;
export const MAX_KEYWORD_LENGTH = 40;

/** Split a pasted/typed keyword list (commas, semicolons or new lines) and merge it into existing keywords. */
export function mergeKeywords(existing: string[], raw: string): string[] {
  const out = [...existing];
  for (const piece of raw.split(/[,;\n]+/)) {
    const t = piece.trim().toLowerCase().slice(0, MAX_KEYWORD_LENGTH).trim();
    if (!t || out.includes(t)) continue;
    if (out.length >= MAX_KEYWORDS) break;
    out.push(t);
  }
  return out;
}
