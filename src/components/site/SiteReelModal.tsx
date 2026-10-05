import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { categoryLabel, FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";
import { SiteReelHeart } from "./SiteReelHeart";

/** Pop-up for a saved website reel; same layout as the Directory reel pop-up (drawer on phones). */
export function SiteReelModal({ reel, onClose }: { reel: SiteReel | null; onClose: () => void }) {
  const mobile = useIsMobile();
  if (!reel) return null;
  const body = <Body reel={reel} onClose={onClose} />;
  return mobile ? (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92dvh] overflow-x-hidden overflow-y-auto pb-6 font-ap"><DrawerTitle className="sr-only">{reel.title}</DrawerTitle>{body}</DrawerContent>
    </Drawer>
  ) : (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[860px] gap-0 overflow-hidden rounded-[24px] p-0 font-ap"><DialogTitle className="sr-only">{reel.title}</DialogTitle>{body}</DialogContent>
    </Dialog>
  );
}

function Body({ reel, onClose }: { reel: SiteReel; onClose: () => void }) {
  return (
    <div className="grid min-w-0 text-ap-ink sm:grid-cols-[1fr_1fr]">
      <div className="grid h-[min(52dvh,100vw)] grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden bg-ap-panel p-5 sm:h-auto sm:min-h-[460px] sm:p-[10%]">
        <video controls autoPlay loop muted playsInline poster={reel.poster ?? undefined} className="h-full max-h-full w-auto max-w-full rounded-lg object-contain shadow-ap-soft sm:h-auto sm:max-h-[520px]">
          {reel.videoWebm && <source src={reel.videoWebm} type="video/webm" />}
          <source src={reel.video} type="video/mp4" />
        </video>
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-8">
        <p className="text-[14px] font-semibold text-ap-badge">{categoryLabel(reel.category)}</p>
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] break-words sm:text-[26px]">{reel.title}</h2>
        <p className="text-[15px]">by {reel.brandSlug
          ? <Link to="/directory/$slug" params={{ slug: reel.brandSlug }} onClick={onClose} className="font-semibold hover:text-ap-blue">{reel.brand}</Link>
          : <span className="font-semibold">{reel.brand}</span>}</p>
        <div className="flex gap-2"><SiteReelHeart inline reelId={reel.id} name={reel.title} /></div>
        {reel.href && <a href={reel.href} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1 text-[14px] text-ap-blue">Visit {reel.brand} <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>}
        <div className="flex flex-wrap gap-1.5 text-[13px] nums">
          {[`${reel.photos} photos`, `${reel.seconds} sec`, FORMAT_LABEL[reel.format]].map((c) => <span key={c} className="rounded-lg bg-ap-panel px-2.5 py-1">{c}</span>)}
        </div>
        <Link to="/app/ads" onClick={onClose} className="mt-auto grid h-12 place-items-center rounded-lg bg-ap-blue text-[16px] font-semibold text-ap-card">Make one like this</Link>
      </div>
    </div>
  );
}
