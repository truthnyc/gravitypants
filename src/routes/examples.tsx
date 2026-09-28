import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelPhone } from "@/components/site/ReelPhone";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { Button } from "@/components/ui/button";
import { galleryExamples, type GalleryExample } from "@/lib/site/examples";

const categories = [{ id: "all", label: "All" }, { id: "fashion", label: "Fashion" }, { id: "food", label: "Food & drink" }, { id: "beauty", label: "Beauty" }, { id: "home", label: "Home" }] as const;
const formats = [{ id: "all", label: "All formats", short: "All" }, { id: "916", label: "9:16", short: "9:16" }, { id: "11", label: "1:1", short: "1:1" }, { id: "169", label: "16:9", short: "16:9" }] as const;
const formatLabel = { "916": "9:16", "11": "1:1", "169": "16:9" } as const;
const categoryLabel = { fashion: "Fashion", food: "Food & drink", beauty: "Beauty", home: "Home" } as const;

function GalleryReel({ example }: { example: GalleryExample }) {
  return <div className={`examples-reel examples-reel-${example.format}`} aria-label={`${example.name} animated reel`}>
    <div className="examples-reel-bars" aria-hidden="true">{example.frames.map((_, i) => <span key={i}><i className={`site-fill-${i + 1}`} /></span>)}</div>
    {example.frames.map((src, i) => <div className={`examples-reel-frame site-frame-${i + 1}`} key={src} aria-hidden="true"><img src={src} alt="" loading="lazy" /></div>)}
    <div className="examples-reel-copy"><b>{example.headline}</b><span>{example.sub}</span></div>
  </div>;
}

function GalleryCard({ example }: { example: GalleryExample }) {
  return <article className="examples-card">
    <Link to="/signup" search={{ template: example.id }} className="examples-mobile-card-link" aria-label={`Use ${example.name} style`} />
    <div className="examples-card-media"><GalleryReel example={example} /></div>
    <div className="examples-card-info"><div><h3>{example.name}</h3><p className="examples-card-meta-desktop">{categoryLabel[example.category]} · {formatLabel[example.format]} · {example.photos} photos · {example.seconds} sec</p><p className="examples-card-meta-mobile">{categoryLabel[example.category]} · {formatLabel[example.format]}</p></div>
      <Button asChild variant="siteSecondary" size="site" className="examples-use-style"><Link to="/signup" search={{ template: example.id }}>Use style</Link></Button>
    </div>
  </article>;
}

export const Route = createFileRoute("/examples")({
  validateSearch: z.object({ cat: z.string().optional(), format: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Examples — Gravity Pants" },
    { name: "description", content: "Browse twelve Gravity Pants video ad examples across fashion, food, beauty, and home. Find a style for your photos." },
    { property: "og:title", content: "Examples — Gravity Pants" },
    { property: "og:description", content: "Find a reel you like and use its style for your own products." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ExamplesPage,
});

function ExamplesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/examples" });
  const cat = categories.some(c => c.id === search.cat) ? search.cat : undefined;
  const format = formats.some(f => f.id === search.format) ? search.format : undefined;
  const visible = galleryExamples.filter(example => (!cat || example.category === cat) && (!format || example.format === format));
  return <SiteShell><div className="examples-page">
    <section className="examples-hero examples-container"><span className="site-eyebrow">Examples gallery</span><div><h1>Made with<br />Gravity Pants.</h1><p className="site-lede">Every reel here started as a few still photos. Find one you like and use its style for your own products.</p></div></section>
    <section className="examples-featured examples-container" aria-label="Example of the week"><article className="site-card examples-featured-panel"><div className="examples-featured-copy"><div><span className="examples-badge">Example of the week</span><h2>Candle launch</h2><p>Three product photos, a two-line headline and a slow zoom. Warm, simple and made in minutes.</p></div><div className="examples-featured-bottom"><div className="examples-chips"><span>3 photos</span><span>7.5 sec</span><span>Fade · Slide · Zoom</span><span>9:16 + 1:1</span></div><div className="examples-featured-actions"><Button asChild variant="site" size="site"><Link to="/signup" search={{ template: "candle" }}>Use this style</Link></Button><Button asChild variant="siteSecondary" size="site"><a href="#gallery">How it was made</a></Button></div></div></div><div className="examples-featured-media"><div className="examples-featured-stills"><small>Photos</small>{[1, 2, 3].map(i => <img key={i} src={`/site-art/candle-${i}.svg`} alt="" />)}</div><ArrowRight className="examples-featured-arrow" size={30} strokeWidth={1.7} /><div className="examples-featured-phone"><small>Reel</small><ReelPhone frames={[1, 2, 3].map(i => ({ background: "var(--site-inner)", artwork: <img src={`/site-art/candle-${i}.svg`} alt="" /> }))} headline={"Light up the\nlong nights."} subline="Winter scents · Shop now" logoBadge="[LOGO]" /></div></div></article></section>
    <section id="gallery" className="examples-gallery examples-container" aria-label="Examples gallery"><div className="examples-filters"><div className="examples-categories" role="group" aria-label="Filter by category">{categories.map(option => <Button key={option.id} type="button" variant="ghost" className="examples-filter-button" aria-pressed={(cat || "all") === option.id} onClick={() => navigate({ search: prev => ({ ...prev, cat: option.id === "all" ? undefined : option.id }), hash: "gallery", replace: true })}>{option.label}</Button>)}</div><div className="examples-filter-right"><span className="examples-count" aria-live="polite">{visible.length} {visible.length === 1 ? "example" : "examples"}</span><div className="examples-formats" role="group" aria-label="Filter by format">{formats.map(option => <Button key={option.id} type="button" variant="ghost" className="examples-filter-button" aria-pressed={(format || "all") === option.id} onClick={() => navigate({ search: prev => ({ ...prev, format: option.id === "all" ? undefined : option.id }), hash: "gallery", replace: true })}><span className="examples-format-long">{option.label}</span><span className="examples-format-short">{option.short}</span></Button>)}</div></div></div>
      {visible.length > 0 ? <div className="examples-grid">{visible.map(example => <GalleryCard key={example.id} example={example} />)}</div> : <div className="site-card examples-empty"><h2>No examples in this combination yet.</h2><Button variant="siteSecondary" size="site" onClick={() => navigate({ search: { cat: undefined, format: undefined }, hash: "gallery", replace: true })}>Show all examples</Button></div>}
    </section>
    <section className="examples-submit examples-container"><span>Made something you’re proud of?</span><Link to="/signup">Submit it to the gallery <ArrowRight size={16} strokeWidth={1.7} /></Link></section>
    <section className="examples-closing examples-container"><div className="site-card examples-closing-inner"><div className="examples-closing-copy"><div className="examples-closing-logo"><GravityPantsLogo size={64} /></div><h2>Your next ad is three photos away.</h2><p>Start free and make your first reel in the next few minutes.</p><div><Button asChild variant="site" size="site"><Link to="/signup">Start free</Link></Button><Button asChild variant="siteSecondary" size="site"><Link to="/pricing">See pricing</Link></Button></div></div><div className="examples-closing-orbit" aria-hidden="true"><span /></div></div></section>
  </div></SiteShell>;
}