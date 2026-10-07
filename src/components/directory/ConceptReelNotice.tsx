import { CONCEPT_REEL_NOTICE, isConceptBrand } from "@/lib/directory/concept-reels";
import { cn } from "@/lib/utils";

export function ConceptReelNotice({ brandName, brandSlug, className }: {
  brandName?: string | null | undefined; brandSlug?: string | null | undefined; className?: string | undefined;
}) {
  if (!isConceptBrand(brandName, brandSlug)) return null;
  return <p className={cn("mt-3 text-[12px] leading-relaxed font-normal text-ap-muted whitespace-normal", className)}>{CONCEPT_REEL_NOTICE}</p>;
}