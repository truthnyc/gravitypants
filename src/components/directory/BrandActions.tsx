import { Bookmark, Share2 } from "lucide-react";
import { toast } from "sonner";
import { LikeSave } from "./LikeSave";

const btn = "inline-flex size-11 items-center justify-center rounded-lg bg-ap-panel text-ap-ink transition-colors hover:text-ap-blue";

/** Share / Bookmark, plus Like and Save to favorites (sign-up prompt when signed out). */
export function BrandActions({ brandId, name }: { brandId: string; name: string }) {
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

  return (
    <>
      <LikeSave kind="brand" id={brandId} name={name} />
      <button type="button" onClick={share} aria-label="Share this page" title="Share this page" className={btn}><Share2 className="size-5" strokeWidth={1.7} /></button>
      <button type="button" onClick={bookmark} aria-label="Bookmark" title="Bookmark" className={btn}><Bookmark className="size-5" strokeWidth={1.7} /></button>
    </>
  );
}
