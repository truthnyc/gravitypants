import { Link } from "@tanstack/react-router";
import { type DirectoryCard } from "@/lib/directory/directory";
import { ReelVideo } from "@/components/site/ReelVideo";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { DirectoryReelHeart } from "./LikeSave";
import { ReelPopup, ReelPopupBody } from "./ReelPopup";

const shape = (f: string | undefined) => (f === "9x16" ? "aspect-[9/16] h-full" : f === "16x9" ? "aspect-[16/9] w-full" : "aspect-square h-full");

/** The reel's poster shown whole, at its own shape. */
export function ReelPoster({ card, className = "" }: { card: DirectoryCard; className?: string }) {
  return (
    <div className={`grid place-items-center bg-ap-panel p-[10%] ${className}`}>
      {card.poster
        ? <img src={card.poster} alt={`${card.brand_name} reel`} loading="lazy" className={`max-h-full max-w-full rounded-lg object-contain shadow-ap-soft ${shape(card.formats[0])}`} />
        : <div className={`rounded-lg bg-ap-media ${shape(card.formats[0])}`} />}
    </div>
  );
}

/** The reel centred on its own shape, like the /showcase cards; plays the video once in view. */
function ReelThumb({ card }: { card: DirectoryCard }) {
  const shapeClass = card.formats[0] === "9x16" ? "dir-reel-916" : card.formats[0] === "16x9" ? "dir-reel-169" : "dir-reel-11";
  return (
    <div className={`dir-reel ${shapeClass}`}>
      {card.video ? (
        <ReelVideo noFullscreen video={card.video} poster={card.poster ?? undefined} label={`${card.brand_name} reel`} className="dir-reel-media" />
      ) : card.poster ? (
        <img src={card.poster} alt={`${card.brand_name} reel`} loading="lazy" />
      ) : null}
    </div>
  );
}

function matched(card: DirectoryCard, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const all = [...card.moods, ...card.tags];
  const hits = words.length ? all.filter((t) => words.some((w) => t.includes(w) || w.includes(t))) : [];
  return (hits.length ? hits : all).slice(0, 4);
}

export function DirectoryGrid({ cards, q = "", onOpen }: { cards: DirectoryCard[]; q?: string; onOpen: (c: DirectoryCard) => void }) {
  return (
    <div className="grid gap-5 font-ap [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
      {cards.map((c) => (
        <article key={c.reel_id} className="dir-card min-w-0">
          <div className="relative">
            <button type="button" onClick={() => onOpen(c)} className="dir-card-media block w-full focus-visible:outline-2 focus-visible:outline-ap-blue" aria-label={`Open ${c.brand_name} reel`}>
              <ReelThumb card={c} />
            </button>
            <DirectoryReelHeart reelId={c.reel_id} name={`${c.brand_name} reel`} />
          </div>
          <div className="mt-3 truncate font-semibold">
            <Link to="/directory/$slug" params={{ slug: c.brand_slug }} className="hover:text-ap-blue">{c.brand_name}</Link>
          </div>
          <div className="truncate text-[13px] text-ap-muted nums">
            {c.title ?? c.template_name ?? "Custom reel"} · {c.seconds} sec
          </div>
          <div className="mt-0.5 text-[12px] text-ap-badge">{matched(c, q).join(" · ")}</div>
        </article>
      ))}
    </div>
  );
}

export function CardCarousel({ cards, label, onOpen }: { cards: DirectoryCard[]; label: string; onOpen: (c: DirectoryCard) => void }) {
  return (
    <ReelCarousel
      label={label}
      items={cards.map((c) => ({
        key: c.reel_id,
        media: (hidden) => (
          <div className="relative">
            <button type="button" tabIndex={hidden ? -1 : undefined} onClick={() => onOpen(c)} className="dir-card-media block w-full" aria-label={`Open ${c.brand_name} reel`}>
              <ReelThumb card={c} />
            </button>
            {!hidden && <DirectoryReelHeart reelId={c.reel_id} name={`${c.brand_name} reel`} />}
          </div>
        ),
        title: c.brand_name,
        detail: `${c.title ?? c.template_name ?? "Custom reel"} · ${c.seconds} sec`,
        visit: c.website_url ? { href: c.website_url, label: `Visit ${c.brand_name}` } : undefined,
      }))}
    />
  );
}

/** Shared reel detail presentation. */
export function ReelDetail({ card, onClose }: { card: DirectoryCard | null; onClose: () => void }) {
  if (!card) return null;
  const title = card.title ?? card.template_name ?? "Custom reel";
  return <ReelPopup title={title} onClose={onClose}><ReelPopupBody
    category={card.category} title={title} brandName={card.brand_name} href={card.website_url}
    description={card.description} tags={[...card.moods, ...card.tags]}
    brand={<Link to="/directory/$slug" params={{ slug: card.brand_slug }} onClick={onClose} className="font-semibold hover:text-ap-blue">{card.brand_name}</Link>}
    favorite={<DirectoryReelHeart inline reelId={card.reel_id} name={title} />}
    media={card.video ? <video src={card.video} poster={card.poster ?? undefined} controls autoPlay loop muted playsInline /> : card.poster ? <img src={card.poster} alt={`${card.brand_name} reel`} /> : null}
  /></ReelPopup>;
}
