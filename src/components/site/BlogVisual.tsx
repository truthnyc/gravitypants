import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import photo2 from "@/assets/site/purl-soho-photo-2.webp.asset.json";
import photo3 from "@/assets/site/purl-soho-photo-3.webp.asset.json";
import { FeaturedAdVideo } from "@/components/site/FeaturedAdVideo";

export type BlogVisualKind = "photo-vs-reel" | "formats" | "three-shots" | "timeline-vs-tap";

const PHOTOS = [photo1.url, photo2.url, photo3.url];

function Caption({ children }: { children: string }) {
  return <figcaption className="mt-3 text-[14px] leading-[1.5] text-site-muted">{children}</figcaption>;
}

export function BlogVisual({ kind }: { kind: BlogVisualKind }) {
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
      <Caption>One reel, three sizes, exported at the same time.</Caption>
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
export function BlogCover({ index, className = "" }: { index: number; className?: string }) {
  return <img src={PHOTOS[index % 3]} alt="" loading="lazy" className={`w-full rounded-[8px] object-cover ${className}`} />;
}
