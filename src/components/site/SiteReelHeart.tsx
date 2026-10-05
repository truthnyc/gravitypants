import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const SITE_FAVS_KEY = ["site-reel-favorites"] as const;

/** The signed-in person's saved website reels (ids), or null when signed out. */
export function useSiteReelFavorites() {
  return useQuery({
    queryKey: SITE_FAVS_KEY,
    queryFn: async (): Promise<string[] | null> => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return null;
      const { data } = await (supabase as any).from("site_reel_favorites").select("reel_id, created_at").order("created_at", { ascending: false });
      return (data ?? []).map((r: any) => r.reel_id as string);
    },
    staleTime: 60_000,
  });
}

/** Heart button in the top-right corner of a reel tile. */
export function SiteReelHeart({ reelId, name, inline = false }: { reelId: string; name: string; inline?: boolean | undefined }) {
  const { data: ids } = useSiteReelFavorites();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const saved = !!ids?.includes(reelId);
  if (!/^[0-9a-f-]{36}$/i.test(reelId)) return null;
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (ids === null || ids === undefined) { void navigate({ to: "/signin" }); return; }
    qc.setQueryData<string[]>(SITE_FAVS_KEY, saved ? ids.filter((i) => i !== reelId) : [reelId, ...ids]);
    const t = (supabase as any).from("site_reel_favorites");
    const { error } = saved ? await t.delete().eq("reel_id", reelId) : await t.insert({ reel_id: reelId, user_id: (await supabase.auth.getUser()).data.user?.id });
    if (error) { toast("Couldn't save. Try again."); }
    void qc.invalidateQueries({ queryKey: SITE_FAVS_KEY });
    void qc.invalidateQueries({ queryKey: ["my-favorites"] });
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
      className={cn(inline ? "grid size-11 place-items-center rounded-lg bg-ap-panel transition-colors" : "absolute top-1.5 right-1.5 z-10 grid size-[30px] min-h-0 place-items-center rounded-[8px] bg-ap-card/95", saved ? "text-destructive" : "text-ap-body hover:text-ap-ink")}>
      <Heart className={cn("size-4", saved && "fill-current")} strokeWidth={1.7} />
    </button>
  );
}

