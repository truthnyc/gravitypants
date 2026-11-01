import { ConceptReelNotice } from "@/components/directory/ConceptReelNotice";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { BrandProfileLink } from "./BrandPreview";

export type CarouselItem = {
  key: string;
  media: (hidden: boolean) => ReactNode;
  title: ReactNode;
  detail: ReactNode;
  visit?: { slug: string; label: string } | undefined;
};

/** The home page "Made with Gravity Pants" band: grey band, 250px figures, alternate ones lower, 70s loop that pauses on hover/focus. */
export function ReelCarousel({ items, label, loop = true }: { items: CarouselItem[]; label: string; loop?: boolean }) {
  const looping = loop && items.length >= 5;
  const list = looping ? [...items, ...items] : items;
  return (
    <div className={`home-example-viewport${looping ? "" : " home-example-static"}`} aria-label={label}>
      <div className="home-example-track">
        {list.map((it, i) => {
          const hidden = i >= items.length;
          return (
            <figure key={`${it.key}-${i}`} className="home-example-figure" inert={hidden}>
              {it.media(hidden)}
              <figcaption>
                <b>{it.title}</b>
                <span>{it.detail}</span>
                <ConceptReelNotice brandName={it.visit?.label ?? (typeof it.title === "string" ? it.title : undefined)} />
                {it.visit && (
                  <BrandProfileLink className="showcase-visit" slug={it.visit.slug} cta="carousel-brand-profile" tabIndex={hidden ? -1 : undefined}>
                    {it.visit.label} <ArrowRight size={13} strokeWidth={1.7} />
                  </BrandProfileLink>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
