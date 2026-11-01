import { BrandProfileLink } from "./BrandPreview";
import { categoryLabel, type SiteReel } from "@/lib/site/reels";
import { ReelPopup, ReelPopupBody } from "@/components/directory/ReelPopup";
import { SiteReelHeart } from "./SiteReelHeart";
import { recordBrandClick } from "@/lib/directory/brand-stats.functions";

export function SiteReelModal({ reel, onClose, description, tags = [] }: { reel: SiteReel | null; onClose: () => void; description?: string | null; tags?: string[] }) {
  if (!reel) return null;
  const purlLaunch = reel.brandSlug === "purl-soho" && reel.title === "Launch Kit";
  const displayTags = purlLaunch ? ["cozy", "calm", "crafted", "yarn", "knitting", "cotton", "denim", "craft", "product launch", "new in"] : tags;
  return <ReelPopup title={reel.title} onClose={onClose}><ReelPopupBody reelId={reel.id} category={categoryLabel(reel.category)} title={reel.title} brandName={reel.brand} href={reel.href} onVisit={() => void recordBrandClick({ data: { kind: "site", id: reel.id } }).catch(() => {})} description={description ?? reel.description} tags={displayTags}
    favorite={<SiteReelHeart inline reelId={reel.id} name={reel.title} />}
    brand={reel.brandSlug ? <BrandProfileLink slug={reel.brandSlug} className="font-semibold text-ap-blue hover:underline">{reel.brand}</BrandProfileLink> : <span className="font-semibold">{reel.brand}</span>}
    profile={reel.brandSlug ? <BrandProfileLink slug={reel.brandSlug} cta="reel-popup-brand-page" className="reel-popup-shop">About {reel.brand} →</BrandProfileLink> : undefined}
    media={<video controls autoPlay loop muted playsInline poster={reel.poster ?? undefined}>{reel.videoWebm && <source src={reel.videoWebm} type="video/webm" />}<source src={reel.video} type="video/mp4" /></video>} /></ReelPopup>;
}
