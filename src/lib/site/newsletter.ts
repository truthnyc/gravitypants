import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import type { SitePhoto } from "./homepage";

export type PopupLayout = "split" | "stacked";

export type NewsletterPopupContent = {
  enabled: boolean;
  layout: PopupLayout;
  showImage: boolean;
  eyebrow: string;
  line1: string;
  line2: string;
  description: string;
  note: string;
  image: SitePhoto | null;
};

export const DEFAULT_POPUP: NewsletterPopupContent = {
  enabled: true,
  layout: "split",
  showImage: true,
  eyebrow: "Reel tips",
  line1: "Better reels,",
  line2: "in your inbox",
  description: "Get new templates, real brand examples and quick tips for turning photos into ads.",
  note: "Join the Gravity Pants creative community.",
  image: { ref: photo1.url, alt: "Reel frame from a Gravity Pants ad" },
};
