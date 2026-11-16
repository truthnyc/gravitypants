import { BrandProductList } from "./ReelProducts";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandActions } from "./BrandActions";
import { categorySlug, ratio, type DirectoryCard } from "@/lib/directory/directory";
import { FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";
import { showBrandConceptNotice } from "@/lib/directory/brand-page";
import { recordBrandClick } from "@/lib/directory/brand-stats.functions";

type Brand = { id: string; name: string; slug: string; category: string; logo_url: string | null; website_url: string | null; description: string | null; moods: string[]; affiliated: boolean };
type Related = { name: string; slug: string; poster: string | null; category: string };

export function AimanteBrandPage({ brand, reels, siteReels, more, onOpen, onOpenSite, linkedMoods }: {
  linkedMoods: string[]; brand: Brand; reels: DirectoryCard[]; siteReels: SiteReel[]; more: Related[]; onOpen: (r: DirectoryCard) => void; onOpenSite: (r: SiteReel) => void;
}) {
  const total = reels.length + siteReels.length;
  const cards = [
    ...reels.map((r) => ({ id: r.reel_id, title: r.title ?? r.brand_name, poster: r.poster, video: r.video, seconds: r.seconds, format: ratio(r.formats[0] ?? "9x16"), open: () => onOpen(r) })),
    ...siteReels.map((r) => ({ id: r.id, title: r.title, poster: r.poster, video: r.video, seconds: r.seconds, format: FORMAT_LABEL[r.format], open: () => onOpenSite(r) })),
  ];
  return <main className="aimante-brand-page mx-auto max-w-[1040px] px-4 pt-4 pb-10 font-ap text-ap-ink md:px-6 md:pt-6">
    <header className="mx-auto max-w-[720px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <Link to="/directory" className="min-w-0 text-[15px] text-ap-blue">← Back to the collection</Link>
        <div className="aimante-brand-actions flex shrink-0 items-center gap-2"><BrandActions brandId={brand.id} name={brand.name} /></div>
      </div>
      <div className="mt-4 grid h-[80px] grid-cols-[80px_minmax(0,1fr)] gap-4 md:gap-5">
        {brand.logo_url ? <img src={brand.logo_url} alt={`${brand.name} logo`} className="size-[80px] rounded-[12px] border border-ap-hairline bg-ap-card object-contain" /> : <div className="grid size-[80px] place-items-center rounded-[12px] border border-ap-hairline bg-ap-card text-[12px] text-ap-muted">Logo</div>}
        <div className="flex h-[80px] min-w-0 flex-col justify-between">
          <Link to="/directory/category/$slug" params={{ slug: categorySlug(brand.category) }} className="block !min-h-0 whitespace-nowrap text-[12px] leading-none font-semibold text-ap-blue [text-box:trim-both_cap_alphabetic]">{brand.category}</Link>
          <h1 className="truncate text-[26px] leading-[1.2] font-semibold tracking-[-0.03em] md:text-[32px]">{brand.name}</h1>
          {brand.website_url ? <a href={brand.website_url} target="_blank" rel="noopener noreferrer" onClick={() => void recordBrandClick({ data: { kind: "brand", id: brand.id } }).catch(() => {})} className="block !min-h-0 whitespace-nowrap text-[14px] leading-none text-ap-blue-strong [text-box:trim-both_cap_alphabetic]">Visit {brand.name} ↗</a> : <span aria-hidden />}
        </div>
      </div>
      {brand.description && <p className="mt-4 text-[17px] leading-[1.45] text-ap-body">{brand.description}</p>}
      {showBrandConceptNotice(brand.affiliated) && <p className="mt-2 text-[11px] leading-[1.5] text-ap-muted">Concept reels by Gravity Pants. Not affiliated with or endorsed by the brand.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]" aria-label="Moods">
        {brand.moods.map((m) => linkedMoods.includes(m) ? <Link key={m} to="/directory" search={{ mood: m.toLowerCase() }} className="inline-flex h-7 !min-h-0 items-center rounded-lg bg-ap-soft-blue px-3 text-[13px] font-medium text-ap-badge hover:underline">{m.toLowerCase()}</Link> : <span key={m} className="inline-flex h-7 items-center rounded-lg bg-ap-soft-blue px-3 text-[13px] font-medium text-ap-badge">{m.toLowerCase()}</span>)}
      </div>
    </header>
    <section className="mt-8" aria-labelledby="brand-reels-title">
      <h2 id="brand-reels-title" className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">Reels</h2>
      <div className="grid items-start gap-5 md:grid-cols-2">
        {cards.map((r) => <BrandReelCard key={r.id} card={r} brandName={brand.name} />)}
      </div>
      {total === 0 && <p className="py-8 text-ap-muted">No reels yet. Check back soon.</p>}
    </section>
    <BrandProductList brandId={brand.id} />
    {more.length > 0 && <section className="mt-8" aria-labelledby="related-brands-title">
      <h2 id="related-brands-title" className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">Similar brands</h2>
      <ul className="flex gap-10 overflow-x-auto pb-3">
        {more.slice(0, 4).map((m) => <li key={m.slug} className="w-[150px] shrink-0">
          <Link to="/directory/$slug" params={{ slug: m.slug }} className="block">
            <div className="aspect-[4/5] overflow-hidden rounded-[8px] bg-ap-panel">{m.poster && <img src={m.poster} alt={`${m.name} reel thumbnail`} loading="lazy" className="size-full object-cover" />}</div>
            <p className="mt-2 text-[14px] font-semibold">{m.name}</p><p className="mt-0.5 text-[12px] text-ap-muted">{m.category}</p>
          </Link>
        </li>)}
      </ul>
    </section>}
    <div className="mx-auto mt-8 max-w-[720px] rounded-[12px] bg-ap-soft-blue px-5 py-5 text-center leading-[1.4] text-[15px] text-ap-body">
      <p>Reels made with Gravity Pants.</p>
      <Link to="/aimante/join" hash="apply" data-cta="apply-to-join" className="mt-1 inline-block !min-h-0 text-[16px] font-semibold text-ap-blue">Have a brand? Apply to join →</Link>
    </div>
  </main>;
}
const KNOWN = ["9:16", "4:5", "1:1", "5:4", "16:9"];
/** Nearest standard ratio name for a measured width/height. */
function nearestRatio(w: number, h: number): string {
  const v = w / h;
  return KNOWN.reduce((best, k) => { const [a = 1, b = 1] = k.split(":").map(Number); const [c = 1, d = 1] = best.split(":").map(Number); return Math.abs(a / b - v) < Math.abs(c / d - v) ? k : best; });
}

/** Card box follows the reel's real shape once known, so a stale stored size never shrinks it. */
function BrandReelCard({ card: r, brandName }: { card: { id: string; title: string; poster: string | null; video: string | null; seconds: number; format: string; open: () => void }; brandName: string }) {
  const [format, setFormat] = useState(r.format);
  const measure = (w: number, h: number) => { if (w > 0 && h > 0) setFormat(nearestRatio(w, h)); };
  return <article className="overflow-hidden rounded-[12px] bg-ap-panel p-3">
    <Button variant="ghost" onClick={r.open} aria-label={`Play ${r.title}`} className="relative block h-auto w-full overflow-hidden rounded-lg p-0" style={{ aspectRatio: format.replace(":", "/") }}>
      {r.video ? <video src={r.video} poster={r.poster ?? undefined} preload="metadata" muted playsInline aria-label={`${brandName} reel`} onLoadedMetadata={(e) => measure(e.currentTarget.videoWidth, e.currentTarget.videoHeight)} className="size-full object-contain" /> : r.poster ? <img src={r.poster} alt={`${brandName} reel thumbnail`} loading="lazy" onLoad={(e) => measure(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} className="size-full object-contain" /> : null}
      <span className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ap-card text-ap-ink shadow-ap-soft"><Play aria-hidden className="ml-0.5 size-5" strokeWidth={1.7} /></span>
    </Button>
    <h3 className="mt-3 px-1 text-[16px] font-semibold">{r.title}</h3>
    <p className="mt-0.5 px-1 pb-1 text-[13px] text-ap-muted tabular-nums">{r.seconds} sec · {format}</p>
  </article>;
}
