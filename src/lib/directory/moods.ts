import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type MoodRow = { id: string; name: string; family: string };
type Catalog = { moods: MoodRow[]; byCategory: Record<string, string[]> };

/** The one master mood list (grouped by family) and each category's selection from it. */
export function useMoodCatalog() {
  const q = useQuery({
    queryKey: ["mood-catalog"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Catalog> => {
      const sb = supabase as any;
      const [{ data: moods }, { data: links }] = await Promise.all([
        sb.from("moods").select("id, name, family, sort_order").order("sort_order"),
        sb.from("category_moods").select("category, sort_order, moods(name)").order("sort_order"),
      ]);
      const byCategory: Record<string, string[]> = {};
      for (const l of (links ?? []) as any[]) if (l.moods?.name) (byCategory[l.category] ??= []).push(l.moods.name);
      return { moods: (moods ?? []) as MoodRow[], byCategory };
    },
  });
  const data = q.data ?? { moods: [], byCategory: {} };
  const all = data.moods.map((m) => m.name);
  /** A category's moods; "Other" (or any category without a selection) offers every mood. */
  const forCategory = (c: string) => data.byCategory[c]?.length ? data.byCategory[c]! : all;
  const families = [...new Set(data.moods.map((m) => m.family))].map((f) => ({ family: f, moods: data.moods.filter((m) => m.family === f).map((m) => m.name) }));
  return { ...data, all, forCategory, families, isLoading: q.isLoading };
}
