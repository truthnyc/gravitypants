import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandActions } from "./BrandActions";
import { categorySlug, ratio, type DirectoryCard } from "@/lib/directory/directory";
import { FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";
import { showBrandConceptNotice } from "@/lib/directory/brand-page";
import { recordBrandClick } from "@/lib/directory/brand-stats.functions";

type Brand = { id: string; name: string; slug: string; category: string; logo_url: string | null; website_url: string | null; description: string | null; moods: string[]; affiliated: boolean };
type Related = { name: string; slug: string; poster: string | null; category: string };

export function AimanteBrandPage({ brand, reels, siteReels, more, onOpen, onOpenSite }: {
  brand: Brand; reels: DirectoryCard[]; siteReels: SiteReel[]; more: Related[]; onOpen: (r: DirectoryCard) => void; onOpenSite: (r: SiteReel) => void;
}) {
  const total = reels.length + siteReels.length;
  const sizes = new Set([...reels.flatMap((r) => r.formats.map(ratio)), ...siteReels.map((r) => FORMAT_LABEL[r.format])]);
  const cards = [
    ...reels.map((r) => ({ id: r.reel_id, title: r.template_name ?? r.title ?? "Custom reel", poster: r.poster, video: r.video, seconds: r.seconds, format: ratio(r.formats[0] ?? "9x16"), open: () => onOpen(r) })),
    ...siteReels.map((r) => ({ id: r.id, title: r.title, poster: r.poster, video: r.video, seconds: r.seconds, format: FORMAT_LABEL[r.format], open: () => onOpenSite(r) })),
  ];
  return <main className="aimante-brand-page mx-auto max-w-[1040px] px-4 pt-4 pb-10 font-ap text-ap-ink md:px-6 md:pt-6">
    <header className="mx-auto max-w-[720px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <Link to="/directory" className="min-w-0 text-[15px] text-ap-blue">← Browse</Link>
        <div className="aimante-brand-actions flex shrink-0 items-center gap-2"><BrandActions brandId={brand.id} name={brand.name} /></div>
      </div>
      <div className="mt-4 grid grid-cols-[72px_minmax(0,1fr)] gap-4">
        {brand.logo_url ? <img src={brand.logo_url} alt={`${brand.name} logo`} className="size-[72px] rounded-[12px] border border-ap-hairline bg-ap-card object-contain" /> : <div className="grid size-[72px] place-items-center rounded-[12px] border border-ap-hairline bg-ap-card text-[12px] text-ap-muted">Logo</div>}
        <div className="flex min-w-0 flex-col">
          <div>
            <Link to="/directory/category/$slug" params={{ slug: categorySlug(brand.category) }} className="text-[14px] font-semibold text-ap-blue">{brand.category}</Link>
            <h1 className="mt-0.5 text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] break-words md:text-[40px]">{brand.name}</h1>
          </div>
          {brand.website_url && <a href={brand.website_url} target="_blank" rel="noopener noreferrer" onClick={() => void recordBrandClick({ data: { kind: "brand", id: brand.id } }).catch(() => {})} className="mt-auto inline-block !min-h-0 pt-1.5 text-[16px] text-ap-blue-strong">Visit {brand.name} ↗</a>}
        </div>
      </div>
      {brand.description && <p className="mt-4 text-[17px] leading-[1.45] text-ap-body">{brand.description}</p>}
      {showBrandConceptNotice(brand.affiliated) && <p className="mt-2 text-[11px] leading-[1.5] text-ap-muted">Concept reels by Gravity Pants. Not affiliated with or endorsed by the brand.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]" aria-label="Moods and reel counts">
        {brand.moods.map((m) => <Link key={m} to="/directory" search={{ mood: m }} className="inline-flex h-7 !min-h-0 items-center rounded-lg bg-ap-soft-blue px-3 text-[13px] font-medium text-ap-badge hover:underline">{m.toLowerCase()}</Link>)}
        <span className="text-ap-muted tabular-nums">· {total} {total === 1 ? "reel" : "reels"} · {sizes.size} {sizes.size === 1 ? "size" : "sizes"}</span>
      </div>
    </header>
    <section className="mt-8" aria-labelledby="brand-reels-title">
      <h2 id="brand-reels-title" className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">Reels</h2>
      <div className="grid items-start gap-5 md:grid-cols-2">
        {cards.map((r) => <article key={r.id} className="overflow-hidden rounded-[12px] bg-ap-panel p-3">
          <Button variant="ghost" onClick={r.open} aria-label={`Play ${r.title}`} className="relative block h-auto w-full overflow-hidden rounded-lg p-0" style={{ aspectRatio: r.format.replace(":", "/") }}>
            {r.poster ? <img src={r.poster} alt="" loading="lazy" className="size-full object-contain" /> : <video src={r.video ?? undefined} preload="metadata" muted playsInline className="size-full object-cover" />}
            <span className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ap-card text-ap-ink shadow-ap-soft"><Play aria-hidden className="ml-0.5 size-5" strokeWidth={1.7} /></span>
          </Button>
          <h3 className="mt-3 px-1 text-[16px] font-semibold">{r.title}</h3>
          <p className="mt-0.5 px-1 pb-1 text-[13px] text-ap-muted tabular-nums">{r.seconds} sec · {r.format}</p>
        </article>)}
      </div>
      {total === 0 && <p className="py-8 text-ap-muted">No reels yet. Check back soon.</p>}
    </section>
    {more.length > 0 && <section className="mt-8" aria-labelledby="related-brands-title">
      <h2 id="related-brands-title" className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">More like this</h2>
      <ul className="flex gap-3 overflow-x-auto pb-3">
        {more.map((m) => <li key={m.slug} className="w-[150px] shrink-0">
          <Link to="/directory/$slug" params={{ slug: m.slug }} className="block">
            <div className="aspect-[4/5] overflow-hidden rounded-[8px] bg-ap-panel">{m.poster && <img src={m.poster} alt={`${m.name} reel`} loading="lazy" className="size-full object-cover" />}</div>
            <p className="mt-2 text-[14px] font-semibold">{m.name}</p><p className="mt-0.5 text-[12px] text-ap-muted">{m.category}</p>
          </Link>
        </li>)}
      </ul>
    </section>}
    <div className="mx-auto mt-8 max-w-[720px] rounded-[12px] bg-ap-soft-blue px-5 py-5 text-center leading-[1.4] text-[15px] text-ap-body">
      <p>Reels made with Gravity Pants.</p>
      <Link to="/aimante/join" className="mt-1 inline-block !min-h-0 text-[16px] font-semibold text-ap-blue">List your brand free →</Link>
    </div>
  </main>;
}