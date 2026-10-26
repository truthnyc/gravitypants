import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import photo2 from "@/assets/site/purl-soho-photo-2.webp.asset.json";
import photo3 from "@/assets/site/purl-soho-photo-3.webp.asset.json";
import meaumeGrapes from "@/assets/site/chateau-meaume-grapes.webp.asset.json";
import meaumeGlass from "@/assets/site/chateau-meaume-glass.webp.asset.json";
import meaumeVineyard from "@/assets/site/chateau-meaume-vineyard.webp.asset.json";
import { FeaturedAdVideo } from "@/components/site/FeaturedAdVideo";
import { useEffect, useState } from "react";
import reel0 from "@/assets/site/chateau-meaume-reel-0.jpg.asset.json";
import reel1 from "@/assets/site/chateau-meaume-reel-1.jpg.asset.json";
import reel2 from "@/assets/site/chateau-meaume-reel-2.jpg.asset.json";
import reel3 from "@/assets/site/chateau-meaume-reel-3.jpg.asset.json";
import reel4 from "@/assets/site/chateau-meaume-reel-4.jpg.asset.json";
import reel5 from "@/assets/site/chateau-meaume-reel-5.jpg.asset.json";
import reel6 from "@/assets/site/chateau-meaume-reel-6.jpg.asset.json";
import reel7 from "@/assets/site/chateau-meaume-reel-7.jpg.asset.json";

const MEAUME_REEL = [
  { src: reel0.url, alt: "Château Méaume vineyard at dawn with the Château Méaume logo" },
  { src: reel1.url, alt: "Where it all begins." },
  { src: reel2.url, alt: "Visit, taste, stay." },
  { src: reel3.url, alt: "Make yourself at home." },
  { src: reel4.url, alt: "Come and stay." },
  { src: reel5.url, alt: "Bottled at the château." },
  { src: reel6.url, alt: "Ripe fruit. Fresh finish." },
  { src: reel7.url, alt: "From our vines." },
];

function MeaumeReel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % MEAUME_REEL.length), 2200);
    return () => window.clearInterval(t);
  }, []);
  return <div className="relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[8px] bg-site-panel" role="img" aria-label={`Château Méaume reel: ${MEAUME_REEL.slice(1).map((f) => f.alt).join(" ")}`}>
    {MEAUME_REEL.map((f, n) => <img key={f.src} src={f.src} alt="" aria-hidden="true" loading="lazy" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${n === i ? "opacity-100" : "opacity-0"}`} />)}
  </div>;
}

export type BlogVisualKind = "photo-vs-reel" | "formats" | "three-shots" | "timeline-vs-tap" | "meaume-three-shots" | "meaume-formats" | "meaume-hero";

const PHOTOS = [photo1.url, photo2.url, photo3.url];
// Wide vineyard, detail glass, close-up grapes.
const MEAUME_PHOTOS = [meaumeVineyard.url, meaumeGlass.url, meaumeGrapes.url];

function Caption({ children }: { children: string }) {
  return <figcaption className="mt-3 text-[14px] leading-[1.5] text-site-muted">{children}</figcaption>;
}

export function BlogVisual({ kind }: { kind: BlogVisualKind }) {
  if (kind === "meaume-three-shots") {
    const shots = [
      { n: "1", name: "The wide" },
      { n: "2", name: "The detail" },
      { n: "3", name: "The close-up" },
    ];
    return <figure className="mt-8">
      <div className="grid grid-cols-3 gap-3 rounded-[8px] bg-site-panel p-5 md:gap-5 md:p-8">
        {shots.map((s, i) => <div key={s.n}>
          <div className="aspect-[4/5] overflow-hidden rounded-[8px]">
            <img src={MEAUME_PHOTOS[i]} alt={`${s.name} shot at Château Méaume`} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <p className="mt-3 text-[13px] font-semibold tabular-nums text-site-eyebrow">{s.n}</p>
          <p className="text-[15px] font-semibold text-site-ink">{s.name}</p>
        </div>)}
      </div>
      <Caption>Wide, detail, close-up. Shot in the same order every time.</Caption>
    </figure>;
  }
  if (kind === "meaume-formats") {
    const formats = [
      { label: "9:16", use: "Reels, Stories, TikTok", cls: "aspect-[9/16] w-[28%]" },
      { label: "1:1", use: "Feeds", cls: "aspect-square w-[34%]" },
      { label: "16:9", use: "Banners, YouTube", cls: "aspect-video w-[38%]" },
    ];
    return <figure className="mt-8">
      <div className="flex items-end gap-3 rounded-[8px] bg-site-panel p-5 md:gap-5 md:p-8">
        {formats.map((f, i) => <div key={f.label} className={f.cls}>
          <div className="relative h-full w-full overflow-hidden rounded-[8px]">
            <img src={MEAUME_PHOTOS[i]} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full scale-125 object-cover blur-md" />
            <img src={MEAUME_PHOTOS[i]} alt={`${f.label} version of a Château Méaume ad`} loading="lazy" className="relative h-full w-full object-contain" />
          </div>
          <p className="mt-2 text-[14px] font-semibold tabular-nums text-site-ink">{f.label}</p>
          <p className="text-[13px] text-site-muted">{f.use}</p>
        </div>)}
      </div>
      <Caption>One reel, every size you need, exported at the same time.</Caption>
    </figure>;
  }
  if (kind === "meaume-hero") {
    return <figure className="mt-8">
      <div className="rounded-[8px] bg-site-panel p-5 md:p-8">
        <MeaumeReel />
      </div>
      <Caption>Photos like these are all a reel needs.</Caption>
    </figure>;
  }
  if (kind === "photo-vs-reel") {
    return <figure className="mt-8">
      <div className="grid grid-cols-2 items-end gap-4 rounded-[8px] bg-site-panel p-5 md:gap-8 md:p-8">
        <div>
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">Photo</p>
          <img src={PHOTOS[0]} alt="A single still product photo of yarn" loading="lazy" className="aspect-[9/16] w-full rounded-[8px] object-cover" />
        </div>
        <div>
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">Reel</p>
          <div className="[&_.site-phone]:!w-full [&_.site-phone]:!max-w-none"><FeaturedAdVideo tapToggle /></div>
        </div>
      </div>
      <Caption>The same photos, before and after. Tap the reel to play or pause.</Caption>
    </figure>;
  }
  if (kind === "formats") {
    const formats = [
      { label: "9:16", use: "Reels, Stories, TikTok", cls: "aspect-[9/16] w-[28%]" },
      { label: "1:1", use: "Feeds", cls: "aspect-square w-[34%]" },
      { label: "16:9", use: "Banners, YouTube", cls: "aspect-video w-[38%]" },
    ];
    return <figure className="mt-8">
      <div className="flex items-end gap-3 rounded-[8px] bg-site-panel p-5 md:gap-5 md:p-8">
        {formats.map((f, i) => <div key={f.label} className={f.cls}>
          <img src={PHOTOS[i]} alt={`${f.label} version of the ad`} loading="lazy" className="h-full w-full rounded-[8px] object-cover" />
          <p className="mt-2 text-[14px] font-semibold tabular-nums text-site-ink">{f.label}</p>
          <p className="text-[13px] text-site-muted">{f.use}</p>
        </div>)}
      </div>
      <Caption>One reel, every size you need, exported at the same time.</Caption>
    </figure>;
  }
  if (kind === "three-shots") {
    const shots = [
      { n: "1", name: "The wide", pos: "50% 50%", zoom: 1 },
      { n: "2", name: "The detail", pos: "50% 45%", zoom: 1.8 },
      { n: "3", name: "The close-up", pos: "55% 40%", zoom: 2.8 },
    ];
    return <figure className="mt-8">
      <div className="grid grid-cols-3 gap-3 rounded-[8px] bg-site-panel p-5 md:gap-5 md:p-8">
        {shots.map((s) => <div key={s.n}>
          <div className="aspect-[4/5] overflow-hidden rounded-[8px]">
            <img src={PHOTOS[1]} alt={`${s.name} shot of the product`} loading="lazy" className="h-full w-full object-cover" style={{ transform: `scale(${s.zoom})`, transformOrigin: s.pos }} />
          </div>
          <p className="mt-3 text-[13px] font-semibold tabular-nums text-site-eyebrow">{s.n}</p>
          <p className="text-[15px] font-semibold text-site-ink">{s.name}</p>
        </div>)}
      </div>
      <Caption>Wide, detail, close-up. Shot in the same order every time.</Caption>
    </figure>;
  }
  return <figure className="mt-8">
    <div className="grid gap-4 rounded-[8px] bg-site-panel p-5 md:grid-cols-2 md:p-8">
      <div>
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">Timeline editor</p>
        <div className="space-y-2 rounded-[4px] bg-site-innerPanel p-3" aria-hidden="true">
          {[70, 45, 85, 30, 60].map((w, i) => <div key={i} className="flex items-center gap-2">
            <span className="w-8 text-[11px] tabular-nums text-site-muted">T{i + 1}</span>
            <div className="relative h-4 flex-1 rounded-[4px] bg-site-panel">
              <div className="absolute inset-y-0 rounded-[4px] bg-site-muted/40" style={{ left: `${(i * 13) % 30}%`, width: `${w - 20}%` }} />
              {[20, 48, 76].map((k) => <span key={k} className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-site-muted" style={{ left: `${(k + i * 7) % 90}%` }} />)}
            </div>
          </div>)}
        </div>
        <p className="mt-3 text-[14px] text-site-muted">Tracks, keyframes, hidden layers.</p>
      </div>
      <div>
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-site-eyebrow">Gravity Pants</p>
        <div className="relative mx-auto aspect-[9/16] max-h-[260px] overflow-hidden rounded-[8px]">
          <img src={PHOTOS[2]} alt="An ad ready to edit by tapping" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-x-3 top-4 rounded-[8px] border-2 border-dashed border-site-primary bg-site-panel/90 px-2 py-1 text-center text-[12px] font-semibold text-site-ink">Tap to rewrite</span>
          <span className="absolute inset-x-6 bottom-4 rounded-[8px] bg-site-panel/90 px-2 py-1 text-center text-[11px] text-site-ink">Tap a photo to swap it</span>
        </div>
        <p className="mt-3 text-center text-[14px] text-site-muted">A reel that already plays. Tap what you want to change.</p>
      </div>
    </div>
    <Caption>Start from a finished reel instead of an empty timeline.</Caption>
  </figure>;
}

/** Small cover image for blog cards. */
export function BlogCover({ index, src, className = "" }: { index: number; src?: string | undefined; className?: string }) {
  return <img src={src ?? PHOTOS[index % 3]} alt="" loading="lazy" className={`w-full rounded-[8px] object-cover ${className}`} />;
}
