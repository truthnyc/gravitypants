import { CONCEPT_REEL_NOTICE, isConceptBrand } from "@/lib/directory/concept-reels";
import { cn } from "@/lib/utils";

export function ConceptReelNotice({ brandName, brandSlug, className }: {
  brandName?: string | null | undefined; brandSlug?: string | null | undefined; className?: string | undefined;
}) {
  if (!isConceptBrand(brandName, brandSlug)) return null;
  return <p className={cn("concept-reel-notice mt-3 leading-relaxed font-normal text-ap-muted whitespace-normal", className)}>{CONCEPT_REEL_NOTICE}</p>;
}