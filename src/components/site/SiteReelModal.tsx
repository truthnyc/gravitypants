import { Link } from "@tanstack/react-router";
import { categoryLabel, type SiteReel } from "@/lib/site/reels";
import { ReelPopup, ReelPopupBody } from "@/components/directory/ReelPopup";
import { SiteReelHeart } from "./SiteReelHeart";
import { DEFAULT_EXAMPLE } from "@/lib/site/homepage";

export function SiteReelModal({ reel, onClose, description, tags = [] }: { reel: SiteReel | null; onClose: () => void; description?: string | null; tags?: string[] }) {
  if (!reel) return null;
  const purlLaunch = reel.brandSlug === "purl-soho" && reel.title === "Launch Kit";
  const displayTags = purlLaunch ? ["cozy", "calm", "crafted", "yarn", "knitting", "cotton", "denim", "craft", "product launch", "new in"] : tags;
  return <ReelPopup title={reel.title} onClose={onClose}><ReelPopupBody category={categoryLabel(reel.category)} title={reel.title} brandName={reel.brand} href={reel.href} description={description ?? (purlLaunch ? DEFAULT_EXAMPLE.description : null)} tags={displayTags}
    favorite={<SiteReelHeart inline reelId={reel.id} name={reel.title} />}
    brand={reel.brandSlug ? <Link to="/directory/$slug" params={{ slug: reel.brandSlug }} onClick={onClose} className="font-semibold hover:text-ap-blue">{reel.brand}</Link> : <span className="font-semibold">{reel.brand}</span>}
    media={<video controls autoPlay loop muted playsInline poster={reel.poster ?? undefined}>{reel.videoWebm && <source src={reel.videoWebm} type="video/webm" />}<source src={reel.video} type="video/mp4" /></video>} /></ReelPopup>;
}
