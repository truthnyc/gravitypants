import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getBrandPage } from "@/lib/directory/directory.functions";
import { categoryLabel } from "@/lib/site/reels";
import { useBrandSite } from "./AimanteShell";
import { recordBrandClick } from "@/lib/directory/brand-stats.functions";

const AIMANTE = "https://aimante.co";
const PARAM = "about";

/* One shared open-brand state, so every "About [Brand]" link opens the same preview. */
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function setUrl(slug: string | null) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set(PARAM, slug); else url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, "", url);
}
export function openBrandPreview(slug: string) { current = slug; setUrl(slug); emit(); }
function closeBrandPreview() { current = null; setUrl(null); emit(); }
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/** "About [Brand]": opens the in-page preview on Gravity Pants; a normal profile link on Aimanté. */
export function BrandProfileLink({ slug, className, children, cta, tabIndex }: { slug: string; className?: string; children: ReactNode; cta?: string; tabIndex?: number }) {
  const site = useBrandSite();
  const href = `${AIMANTE}/b/${slug}`;
  if (site === "aimante") return <a href={href} className={className} data-cta={cta} tabIndex={tabIndex}>{children}</a>;
  return <a href={href} className={className} data-cta={cta} tabIndex={tabIndex} aria-haspopup="dialog"
    onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); openBrandPreview(slug); }}>{children}</a>;
}

type Reel = { id: string; title: string; poster: string | null; video: string | null };

/** Mounted once in the Gravity Pants site shell. */
export function BrandPreviewHost() {
  const slug = useSyncExternalStore(subscribe, () => current, () => null);
  useEffect(() => {
    const s = new URL(window.location.href).searchParams.get(PARAM);
    if (s && /^[a-z0-9-]{1,60}$/.test(s)) { current = s; emit(); }
  }, []);
  return <Dialog open={!!slug} onOpenChange={(o) => { if (!o) closeBrandPreview(); }}>
    <DialogContent className="max-h-[90dvh] w-[min(720px,calc(100vw-24px))] max-w-none overflow-y-auto rounded-[4px] p-0 font-ap">
      {slug && <BrandPreviewBody slug={slug} />}
    </DialogContent>
  </Dialog>;
}

function BrandPreviewBody({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useQuery({ queryKey: ["brand-preview", slug], queryFn: () => getBrandPage({ data: { slug } }), staleTime: 300_000 });
  const [playing, setPlaying] = useState<string | null>(null);
  if (isLoading) return <div className="p-8"><DialogTitle className="sr-only">Loading brand</DialogTitle><DialogDescription className="text-[15px] text-secondary-text">Loading…</DialogDescription></div>;
  const brand = data?.brand;
  if (isError || !brand) return <div className="p-8"><DialogTitle className="text-[20px] font-semibold">This brand isn't available right now</DialogTitle><DialogDescription className="mt-2 text-[15px] text-secondary-text">Try again later.</DialogDescription></div>;
  const reels: Reel[] = [
    ...data.siteReels.map((r) => ({ id: r.id, title: r.title, poster: r.poster ?? null, video: r.video ?? null })),
    ...data.reels.map((r) => ({ id: r.reel_id, title: r.title ?? brand.name, poster: r.poster, video: r.video })),
  ];
  return <div className="p-6 sm:p-8">
    <div className="flex items-start gap-4 pr-8">
      {brand.logo_url?.startsWith("https://") && <img src={brand.logo_url} alt={`${brand.name} logo`} className="size-16 shrink-0 rounded-[4px] border border-ap-hairline bg-ap-card object-contain" />}
      <div className="min-w-0">
        <p className="text-[13px] text-secondary-text">{categoryLabel(brand.category)}</p>
        <DialogTitle className="text-[24px] font-semibold leading-tight">{brand.name}</DialogTitle>
      </div>
    </div>
    <DialogDescription className="mt-4 text-[15px] leading-relaxed text-ap-ink">{brand.description || `Reels by ${brand.name}, made with Gravity Pants.`}</DialogDescription>
    {reels.length > 0 && <>
      <h3 className="mt-6 text-[15px] font-semibold">Reels <span className="font-normal tabular-nums text-secondary-text">{reels.length}</span></h3>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {reels.map((r) => <li key={r.id}>
          <div className="relative aspect-square overflow-hidden rounded-[4px] bg-ap-card">
            {playing === r.id && r.video
              ? <video src={r.video} poster={r.poster ?? undefined} controls autoPlay loop muted playsInline className="size-full object-contain" />
              : <button type="button" onClick={() => setPlaying(r.id)} disabled={!r.video} className="group relative size-full" aria-label={`Play ${r.title}`}>
                  {r.poster && <img src={r.poster} alt="" className="size-full object-cover" />}
                  {r.video && <span className="absolute inset-0 grid place-items-center"><span className="grid size-10 place-items-center rounded-full bg-background/85 text-ap-ink"><Play className="size-4" strokeWidth={1.7} /></span></span>}
                </button>}
          </div>
          <p className="mt-1.5 truncate text-[13px]">{r.title}</p>
        </li>)}
      </ul>
    </>}
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ap-hairline pt-5">
      {brand.website_url && <a href={brand.website_url} target="_blank" rel="noreferrer" data-cta="brand-preview-visit" onClick={() => void recordBrandClick({ data: { kind: "brand", id: brand.id } }).catch(() => {})} className="inline-flex items-center gap-1.5 text-[15px] text-ap-blue">Visit {brand.name} <ArrowUpRight className="size-4" strokeWidth={1.7} /></a>}
      <a href={`${AIMANTE}/b/${brand.slug}`} target="_blank" rel="noreferrer" data-cta="brand-preview-aimante" className="ml-auto inline-flex items-center gap-1 text-[13px] text-secondary-text hover:text-ap-ink">Curated on Aimanté <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>
    </div>
  </div>;
}
