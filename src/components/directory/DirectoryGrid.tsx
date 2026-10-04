import { Link } from "@tanstack/react-router";
import type { DirectoryCard } from "@/lib/directory/directory";

const SIZE = (f: string) => f.replace("x", ":");

export function DirectoryGrid({ cards }: { cards: DirectoryCard[] }) {
  if (!cards.length) return <p className="py-10 text-center text-[15px] text-ap-muted">No reels match yet. Try another word or mood.</p>;
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <article key={c.reel_id} className="min-w-0 font-ap">
          <Link to="/directory/$slug" params={{ slug: c.brand_slug }} className="block">
            <div className="aspect-square overflow-hidden rounded-lg bg-ap-media shadow-ap-soft ring-1 ring-ap-inner">
              {c.poster && <img src={c.poster} alt={`${c.brand_name} reel`} loading="lazy" className="size-full object-cover" />}
            </div>
          </Link>
          <div className="mt-2.5 font-semibold">
            <Link to="/directory/$slug" params={{ slug: c.brand_slug }} className="text-ap-ink">{c.brand_name}</Link>
          </div>
          <div className="text-[13px] text-ap-muted nums">{[c.template_name, c.formats.map(SIZE).join(" · ")].filter(Boolean).join(" · ")}</div>
          <div className="mt-1 flex flex-wrap text-[12px] text-ap-badge">
            {[...c.moods, ...c.tags].slice(0, 6).map((t, i) => <span key={t}>{i > 0 && <span className="mx-1 text-ap-muted">·</span>}{t}</span>)}
          </div>
        </article>
      ))}
    </div>
  );
}
