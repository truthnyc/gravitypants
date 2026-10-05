import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { LikeSave } from "./LikeSave";

const btn = "inline-flex size-9 items-center justify-center rounded-lg text-ap-muted transition-colors hover:text-ap-ink";

/** Share, plus Like and Save to favorites (sign-up prompt when signed out). */
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

  return (
    <>
      <LikeSave kind="brand" id={brandId} name={name} brand />
      <button type="button" onClick={share} aria-label="Share this page" title="Share this page" className={btn}><Share2 className="size-5" strokeWidth={1.7} /></button>
    </>
  );
}
