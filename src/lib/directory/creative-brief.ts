/** Pure parser for a pasted onboarding brief: scene moods, colour palette, grouped hashtags and keyword tags. */
export type BriefScene = { title: string; text: string };
export type BriefTagGroup = { label: string; tags: string[] };
export type CreativeBrief = { scenes: BriefScene[]; palette: string; colors: string[]; tagGroups: BriefTagGroup[]; keywords: string[] };

export const emptyBrief = (): CreativeBrief => ({ scenes: [], palette: "", colors: [], tagGroups: [], keywords: [] });

export function parseCreativeBrief(input: string): CreativeBrief {
  const out = emptyBrief();
  let section: "moods" | "tags" | null = null;
  let group: BriefTagGroup | null = null;
  for (const raw of input.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^moods?$/i.test(line)) { section = "moods"; group = null; continue; }
    if (/^tags?$/i.test(line)) { section = "tags"; group = null; continue; }
    const colour = line.match(/^colou?r palette\s*:\s*(.*)$/i);
    if (colour) { out.palette = colour[1]!.trim(); out.colors = [...new Set((out.palette.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) ?? []).map((c) => c.toUpperCase()))]; continue; }
    const keyword = line.match(/^keyword tags[^:]*:\s*(.*)$/i);
    if (keyword) { out.keywords = [...new Set(keyword[1]!.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean))]; continue; }
    const hashes = line.match(/#[\p{L}\p{N}_]+/gu);
    const heading = line.match(/^([^#:]{1,40}):\s*(.*)$/);
    if (section === "tags" || hashes) {
      if (heading && !heading[2]!.trim()) { group = { label: heading[1]!.trim(), tags: [] }; out.tagGroups.push(group); continue; }
      if (hashes) {
        if (!group) { group = { label: heading?.[1]?.trim() || "Tags", tags: [] }; out.tagGroups.push(group); }
        for (const h of hashes) if (!group.tags.includes(h.slice(1))) group.tags.push(h.slice(1));
        continue;
      }
    }
    if (section === "moods" && heading) out.scenes.push({ title: heading[1]!.trim(), text: heading[2]!.trim() });
    else if (section === "moods") out.scenes.push({ title: line, text: "" });
  }
  return out;
}

/** Master moods named in the brief's scenes (word stems like "minimalism" → "minimal"). */
export function detectMoods(brief: CreativeBrief, catalog: string[]): string[] {
  const text = brief.scenes.map((s) => `${s.title} ${s.text}`).join(" ").toLowerCase();
  return catalog.filter((m) => new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(ism|ist|ity|ness|ly|th)?\\b`).test(text));
}

/** Reel tags (lowercase, deduped, max 40 chars each): hashtags first, then keyword phrases. */
export function briefTags(brief: CreativeBrief): string[] {
  const all = [...brief.tagGroups.flatMap((g) => g.tags), ...brief.keywords].map((t) => t.toLowerCase().slice(0, 40));
  return [...new Set(all)].slice(0, 60);
}
