import { useEffect, useState } from "react";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const btn = "inline-flex h-11 items-center gap-1.5 rounded-lg bg-ap-panel px-4 text-[15px] font-medium text-ap-ink";

/** Share / Bookmark for everyone; "Save to my favorites" for signed-in people (RLS keeps favorites private). */
export function BrandActions({ brandId, name }: { brandId: string; name: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (!id) return;
      const { data: row } = await supabase.from("directory_favorites").select("brand_id").eq("brand_id", brandId).maybeSingle();
      setSaved(!!row);
    });
  }, [brandId]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${name} on Gravity Pants`, url }); } catch { /* cancelled */ }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const bookmark = () => {
    const mac = /Mac|iPhone|iPad/.test(navigator.userAgent);
    toast(`Press ${mac ? "⌘" : "Ctrl"}+D to bookmark this page`);
  };

  const toggle = async () => {
    if (!userId) return;
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("directory_favorites").insert({ user_id: userId, brand_id: brandId })
      : await supabase.from("directory_favorites").delete().eq("brand_id", brandId);
    if (error) { setSaved(!next); toast.error("Couldn't update your favorites. Try again."); return; }
    toast.success(next ? "Saved to your favorites" : "Removed from your favorites");
  };

  return (
    <>
      <button type="button" onClick={share} className={btn}><Share2 className="size-4" strokeWidth={1.7} />Share this page</button>
      <button type="button" onClick={bookmark} className={btn}><Bookmark className="size-4" strokeWidth={1.7} />Bookmark</button>
      {userId && (
        <button type="button" onClick={toggle} aria-pressed={saved} className={cn(btn, saved && "text-ap-blue")}>
          <Heart className={cn("size-4", saved && "fill-current")} strokeWidth={1.7} />
          {saved ? "Saved to my favorites" : "Save to my favorites"}
        </button>
      )}
    </>
  );
}
