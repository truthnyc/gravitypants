import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TAG_KINDS, type TagKind } from "@/lib/directory/tag-kinds";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type MoodRow = { id: string; name: string; family: string; kind: TagKind };
type Catalog = { moods: MoodRow[]; byCategory: Record<string, string[]>; aliases: Record<string, string> };

/** The master tag list: Moods grouped by family, plus Occasion, Season and Setting values, and each category's mood selection. */
export function useMoodCatalog() {
  const q = useQuery({
    queryKey: ["mood-catalog"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Catalog> => {
      const sb = supabase as any;
      const [{ data: moods }, { data: links }, { data: al }] = await Promise.all([
        sb.from("moods").select("id, name, family, kind, sort_order").order("sort_order"),
        sb.from("category_moods").select("category, sort_order, moods(name)").order("sort_order"),
        sb.from("mood_aliases").select("alias, target"),
      ]);
      const byCategory: Record<string, string[]> = {};
      for (const l of (links ?? []) as any[]) if (l.moods?.name) (byCategory[l.category] ??= []).push(l.moods.name);
      const aliases: Record<string, string> = {};
      for (const a of (al ?? []) as any[]) aliases[a.alias] = a.target;
      return { moods: ((moods ?? []) as any[]).map((m) => ({ ...m, kind: (m.kind ?? "mood") as TagKind })), byCategory, aliases };
    },
  });
  const data = q.data ?? { moods: [], byCategory: {}, aliases: {} };
  const moodRows = data.moods.filter((m) => m.kind === "mood");
  /** Mood-kind names only (Occasion/Season/Setting live in `kinds`). */
  const all = moodRows.map((m) => m.name);
  const forCategory = (c: string) => (data.byCategory[c]?.filter((m) => all.includes(m)).length ? data.byCategory[c]!.filter((m) => all.includes(m)) : all);
  const families = [...new Set(moodRows.map((m) => m.family))].map((f) => ({ family: f, moods: moodRows.filter((m) => m.family === f).map((m) => m.name) }));
  const kinds = Object.fromEntries(TAG_KINDS.map((k) => [k, data.moods.filter((m) => m.kind === k).map((m) => m.name)])) as Record<TagKind, string[]>;
  const kindOf = (name: string): TagKind => data.moods.find((m) => m.name === name.toLowerCase())?.kind ?? "mood";
  const resolve = (name: string) => data.aliases[name.toLowerCase()] ?? name.toLowerCase();
  return { ...data, all, forCategory, families, kinds, kindOf, resolve, everyName: data.moods.map((m) => m.name), isLoading: q.isLoading };
}
