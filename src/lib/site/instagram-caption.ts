/** Turns a reel tag into an Instagram hashtag: "down parka" -> "#DownParka". */
export function toHashtag(tag: string): string | null {
  const t = tag.trim().replace(/^#/, "");
  if (!t) return null;
  const words = t.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return null;
  return "#" + (words.length === 1 ? words[0] : words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(""));
}

/** Unique hashtags (case-insensitive), brand first, #GravityPants last, Instagram's 30 cap. */
export function reelHashtags(brand: string, tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [brand, ...tags, "GravityPants"]) {
    const h = toHashtag(raw);
    if (h && !seen.has(h.toLowerCase())) { seen.add(h.toLowerCase()); out.push(h); }
  }
  if (out.length > 30) return [...out.slice(0, 29), "#GravityPants"];
  return out;
}

export function reelCaption(r: { brand: string; title: string; description?: string | null }): string {
  const lines = [`${r.title} by ${r.brand}.`];
  if (r.description?.trim()) lines.push(r.description.trim());
  lines.push("Product photos brought into motion with Gravity Pants. Discover the brand through the link in our bio.");
  return lines.join("\n\n");
}
