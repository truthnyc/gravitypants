import { ConceptReelNotice } from "@/components/directory/ConceptReelNotice";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

export function ReelPopup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const mobile = useIsMobile();
  return mobile ? <Drawer open onOpenChange={(open) => !open && onClose()}><DrawerContent className="reel-popup-drawer font-ap"><DrawerTitle className="sr-only">{title}</DrawerTitle><div className="min-h-0 overflow-y-auto">{children}</div></DrawerContent></Drawer> : <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="reel-popup font-ap" aria-describedby={undefined}><DialogTitle className="sr-only">{title}</DialogTitle>{children}</DialogContent></Dialog>;
}
export function ReelPopupBody({ media, category, title, brand, favorite, href, brandName, description, tags = [], onVisit }: { onVisit?: () => void;  media: ReactNode; category: string; title: string; brand: ReactNode; favorite: ReactNode; href?: string | null; brandName: string; description?: string | null | undefined; tags?: string[] }) {
  return <div className="reel-popup-layout"><div className="reel-popup-media">{media}<div className="reel-popup-favorite">{favorite}</div></div><div className="reel-popup-details"><p className="reel-popup-category">{category}</p><h2 className="reel-popup-title">{title}</h2><p className="reel-popup-brand">by {brand}</p>{description && <p className="reel-popup-description">{description}</p>}<ConceptReelNotice brandName={brandName} />{href && <a href={href} target="_blank" rel="noreferrer" onClick={onVisit} className="reel-popup-shop">Visit {brandName} <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>}<div className="reel-popup-bottom">{tags.length > 0 && <div className="reel-popup-tags"><p>Tags</p><ul>{Array.from(new Set(tags)).map((tag) => <li key={tag}>{tag}</li>)}</ul></div>}<a href="https://gravitypants.com" className="reel-popup-credit">Make reels with Gravity Pants <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a></div></div></div>;
}
