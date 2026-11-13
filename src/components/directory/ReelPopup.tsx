import { ReelProductList } from "./ReelProducts";
import { ConceptReelNotice } from "@/components/directory/ConceptReelNotice";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

/** Optional stepping through the list a reel was opened from, plus mood-fit details. */
export type ReelNav = {
  index: number; total: number; noun?: string;
  onPrev: () => void; onNext: () => void;
  mood?: string | undefined; fit?: string[] | undefined;
  /** Opens the stage view on this reel with the same filters and order. */
  stage?: { mood?: string | undefined; categories: string[]; seed: string; start: string } | undefined;
};
export const ReelNavContext = createContext<ReelNav | null>(null);

const andJoin = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

function NavButtons({ nav }: { nav: ReelNav }) {
  const hasPrev = nav.index > 0, hasNext = nav.index < nav.total - 1;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft" && hasPrev) { e.preventDefault(); nav.onPrev(); }
      if (e.key === "ArrowRight" && hasNext) { e.preventDefault(); nav.onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, hasPrev, hasNext]);
  return <>
    <button type="button" aria-label="Previous reel" disabled={!hasPrev} onClick={nav.onPrev} className="reel-popup-step reel-popup-step-prev"><ChevronLeft className="size-5" strokeWidth={1.7} /></button>
    <button type="button" aria-label="Next reel" disabled={!hasNext} onClick={nav.onNext} className="reel-popup-step reel-popup-step-next"><ChevronRight className="size-5" strokeWidth={1.7} /></button>
  </>;
}

export function ReelPopup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const mobile = useIsMobile();
  const nav = useContext(ReelNavContext);
  const steps = nav && nav.total > 1 ? <NavButtons nav={nav} /> : null;
  return mobile ? <Drawer open onOpenChange={(open) => !open && onClose()}><DrawerContent className="reel-popup-drawer font-ap"><DrawerTitle className="sr-only">{title}</DrawerTitle><div className="min-h-0 overflow-y-auto">{children}</div>{steps}</DrawerContent></Drawer> : <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="reel-popup font-ap" aria-describedby={undefined}><DialogTitle className="sr-only">{title}</DialogTitle>{children}{steps}</DialogContent></Dialog>;
}
export function ReelPopupBody({ media, category, title, brand, favorite, href, brandName, description, tags = [], onVisit, download, reelId, profile }: { profile?: ReactNode; reelId?: string | null; download?: string | null; onVisit?: () => void;  media: ReactNode; category: string; title: string; brand: ReactNode; favorite: ReactNode; href?: string | null; brandName: string; description?: string | null | undefined; tags?: string[] }) {
  const nav = useContext(ReelNavContext);
  const fitSet = new Set(nav?.mood ? (nav.fit ?? []) : []);
  const fits = Array.from(new Set(tags)).filter((t) => fitSet.has(t.toLowerCase())).slice(0, 3);
  return <div className="reel-popup-layout"><div className="reel-popup-media">{media}<div className="reel-popup-favorite">{favorite}</div></div><div className="reel-popup-details">{nav && nav.total > 1 && <p className="reel-popup-count nums">{nav.index + 1} of {nav.total} {nav.mood ? `${nav.mood} ` : ""}{nav.noun ?? "reels"}</p>}<p className="reel-popup-category">{category}</p><h2 className="reel-popup-title">{title}</h2><p className="reel-popup-brand">by {brand}</p>{nav?.mood && fits.length > 0 && <p className="reel-popup-fit">Fits {nav.mood}: {andJoin(fits)}</p>}{description && <p className="reel-popup-description">{description}</p>}<ConceptReelNotice brandName={brandName} />{profile}{!profile && href && <a href={href} target="_blank" rel="noreferrer" onClick={onVisit} className="reel-popup-shop">Visit {brandName} <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>}{download && <a href={download} download target="_blank" rel="noreferrer" data-cta="reel-download" onClick={() => window.__lovableEvents?.track?.("project.reel_download_clicked", { reel_id: reelId ?? "unknown", reel_title: title.slice(0, 80), page: "popup" })} className="reel-popup-shop">Download reel <Download className="size-3.5" strokeWidth={1.7} /></a>}<div className="reel-popup-bottom">{tags.length > 0 && <div className="reel-popup-tags"><p>Tags</p><ul>{Array.from(new Set(tags)).map((tag) => <li key={tag} data-fit={fitSet.has(tag.toLowerCase()) || undefined}>{tag}</li>)}</ul></div>}<ReelProductList reelId={reelId} className="reel-popup-products w-full" />{nav?.stage && <StageLink stage={nav.stage} />}<a href="https://gravitypants.com" className="reel-popup-credit">Make reels with Gravity Pants <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a></div></div></div>;
}

function StageLink({ stage }: { stage: NonNullable<ReelNav["stage"]> }) {
  const search = { start: stage.start, seed: stage.seed || undefined, categories: stage.categories.join("|") || undefined };
  const cls = "reel-popup-credit reel-popup-stage";
  const inner = <>Open in stage view <span className="rounded-[4px] bg-ap-soft-blue px-1.5 text-[11px] font-semibold text-ap-blue">Beta</span></>;
  return stage.mood
    ? <Link to="/stage/$mood" params={{ mood: stage.mood }} search={search} className={cls}>{inner}</Link>
    : <Link to="/stage" search={search} className={cls}>{inner}</Link>;
}
