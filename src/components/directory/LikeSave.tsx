import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLikeCounts } from "@/lib/directory/favorites.functions";
import { cn } from "@/lib/utils";

type Kind = "reel" | "brand";
const btn = "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-ap-panel px-3 text-ap-ink transition-colors hover:text-ap-blue";
const brandBtn = "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-3 text-ap-muted transition-colors hover:text-ap-ink";

function useSignupGate() {
  const navigate = useNavigate();
  return () => {
    toast("Create a free account to like and save reels.");
    void navigate({ to: "/signup", search: { redirect: window.location.pathname + window.location.search } });
  };
}

/** Like (public count) and Save to favorites (private list) for a reel or brand. Signed-out taps go to sign-up. */
export function LikeSave({ kind, id, name, showSave = true, brand = false }: { kind: Kind; id: string; name: string; showSave?: boolean; brand?: boolean }) {
  const cls = brand ? brandBtn : btn;
  const counts = useServerFn(getLikeCounts);
  const qc = useQueryClient();
  const gate = useSignupGate();
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const q = useQuery({ queryKey: ["like-count", id], queryFn: () => counts({ data: { ids: [id] } }), staleTime: 30_000 });
  const count = q.data?.[id] ?? 0;
  const favTable = kind === "reel" ? "directory_reel_favorites" : "directory_favorites";
  const favCol = kind === "reel" ? "reel_id" : "brand_id";

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const [l, f] = await Promise.all([
        supabase.from("directory_likes").select("target_id").eq("target_type", kind).eq("target_id", id).maybeSingle(),
        (supabase.from(favTable) as any).select(favCol).eq(favCol, id).maybeSingle(),
      ]);
      setLiked(!!l.data);
      setSaved(!!f.data);
    });
  }, [id, kind, favTable, favCol]);

  const like = async () => {
    if (!userId) return gate();
    const next = !liked;
    setLiked(next);
    qc.setQueryData(["like-count", id], { [id]: Math.max(0, count + (next ? 1 : -1)) });
    const { error } = next
      ? await supabase.from("directory_likes").insert({ user_id: userId, target_type: kind, target_id: id })
      : await supabase.from("directory_likes").delete().eq("target_type", kind).eq("target_id", id);
    if (error) { setLiked(!next); toast.error("Couldn't update your like. Try again."); }
    void qc.invalidateQueries({ queryKey: ["like-count", id] });
  };

  const save = async () => {
    if (!userId) return gate();
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await (supabase.from(favTable) as any).insert({ user_id: userId, [favCol]: id })
      : await (supabase.from(favTable) as any).delete().eq(favCol, id);
    if (error) { setSaved(!next); toast.error("Couldn't update your favorites. Try again."); return; }
    toast.success(next ? "Saved to your favorites" : "Removed from your favorites");
    void qc.invalidateQueries({ queryKey: ["my-favorites"] });
  };

  return (
    <>
      <button type="button" onClick={() => void like()} aria-pressed={liked} aria-label={`${liked ? "Unlike" : "Like"} ${name}`} title={liked ? "Liked" : "Like"} className={cn(cls, liked && brand && "text-[#da0519]", !brand && liked && "text-ap-blue")}>
        <ThumbsUp className={cn("size-5", liked && "fill-current")} strokeWidth={1.7} />
        <span className="text-[14px] font-semibold nums">{count}</span>
      </button>
      {showSave && (
        <button type="button" onClick={() => void save()} aria-pressed={saved} aria-label={saved ? "Remove from my favorites" : "Save to my favorites"} title={saved ? "Saved to my favorites" : "Save to my favorites"} className={cn(cls, saved && brand && "text-[#da0519]", !brand && saved && "text-ap-blue")}>
          <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.7} />
        </button>
      )}
    </>
  );
}
