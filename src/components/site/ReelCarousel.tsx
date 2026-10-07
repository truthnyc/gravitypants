import { ConceptReelNotice } from "@/components/directory/ConceptReelNotice";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

export type CarouselItem = {
  key: string;
  media: (hidden: boolean) => ReactNode;
  title: ReactNode;
  detail: ReactNode;
  visit?: { href: string; label: string } | undefined;
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
                <ConceptReelNotice brandName={it.visit?.label} />
                {it.visit && (
                  <a className="showcase-visit" href={it.visit.href} target="_blank" rel="noreferrer" tabIndex={hidden ? -1 : undefined}>
                    {it.visit.label} <ArrowUpRight size={13} strokeWidth={1.7} />
                  </a>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
