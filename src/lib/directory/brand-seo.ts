/** Search titles/descriptions for Aimanté brand pages: lead with brand and product names so brand + product searches match. */
const clip = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).replace(/[,;:\s—-]+$/, "")}…`;
};
const list = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

export function uniqueProducts(titles: (string | null | undefined)[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const t of titles) { const v = t?.trim(); if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); } }
  return out;
}

export function brandSeo(name: string, products: string[], about?: string | null) {
  const suffix = " | Aimanté";
  let title = `${name} reels and products${suffix}`;
  for (let n = Math.min(products.length, 3); n > 0; n--) {
    const t = `${name}: ${products.slice(0, n).join(", ")}${suffix}`;
    if (t.length <= 65) { title = t; break; }
  }
  const lead = products.length ? `Watch ${name} reels on Aimanté: ${list(products.slice(0, 3))}.` : `Watch ${name} reels on Aimanté.`;
  const description = clip(about?.trim() ? `${lead} ${about.trim()}` : `${lead} Shop the products straight from each reel.`, 158);
  return { title, description };
}
