import { ReelVideo } from "@/components/site/ReelVideo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { FeaturedAdVideo } from "@/components/site/FeaturedAdVideo";
import { GravityPantsLogo } from "@/components/GravityPantsLogo";
import { Button } from "@/components/ui/button";
import type { GalleryExample } from "@/lib/site/examples";
import { EXAMPLES_OG_IMAGE, siteHead } from "@/lib/site/seo";
import { listSiteReels } from "@/lib/site/reels.functions";
import { categoryLabel, type SiteReel } from "@/lib/site/reels";
import { getHomepageContent } from "@/lib/site/homepage.functions";
import { DEFAULT_CONTENT, featuredVideo, photoSrc } from "@/lib/site/homepage";

const reelToExample = (r: SiteReel): GalleryExample => ({ id: r.id, name: r.title, category: r.category, format: r.format, photos: r.photos, seconds: r.seconds, headline: r.title, sub: r.brand, logo: r.brand, video: r.video, ...(r.videoWebm ? { videoWebm: r.videoWebm } : {}), ...(r.poster ? { poster: r.poster } : {}), ...(r.href ? { href: r.href } : {}), frames: [] });

const formats = [{ id: "all", label: "All formats", short: "All" }, { id: "916", label: "9:16", short: "9:16" }, { id: "11", label: "1:1", short: "1:1" }, { id: "169", label: "16:9", short: "16:9" }] as const;
const formatLabel: Record<string, string> = { "916": "9:16", "11": "1:1", "169": "16:9" };

function GalleryReel({ example }: { example: GalleryExample }) {
  if (example.video) {
    return <div className={`examples-reel examples-reel-${example.format}`}>
      <ReelVideo className="examples-reel-video" video={example.video} videoWebm={example.videoWebm} poster={example.poster} label={`${example.name} video ad`} />
    </div>;
  }

  return <div className={`examples-reel examples-reel-${example.format}${example.layout === "top" ? " examples-reel-top" : ""}`} aria-label={`${example.name} animated reel`}>
    <div className="examples-reel-bars" aria-hidden="true">{example.frames.map((_, i) => <span key={i}><i className={`site-fill-${i + 1}`} /></span>)}</div>
    {example.frames.map((src, i) => <div className={`examples-reel-frame site-frame-${i + 1}`} key={src} aria-hidden="true"><img src={src} alt="" loading="lazy" /></div>)}
    <div className="examples-reel-copy"><b>{example.headline}</b><span>{example.sub}</span></div>
    {example.logo && <div className="examples-reel-logo" aria-hidden="true">{example.logo}</div>}
  </div>;
}

function GalleryCard({ example }: { example: GalleryExample }) {
  return <article className="examples-card">
    <div className="examples-card-media">{example.href ? <a className="site-reel-link" href={example.href} target="_blank" rel="noreferrer" aria-label={example.frames?.length ? undefined : `Visit ${example.logo ?? example.name}`}><GalleryReel example={example} /></a> : <GalleryReel example={example} />}</div>
    <div className="examples-card-info"><div><h3>{example.name}</h3><p className="examples-card-meta-desktop">{categoryLabel(example.category)} · {formatLabel[example.format]} · {example.photos} photos · {example.seconds} sec</p><p className="examples-card-meta-mobile">{categoryLabel(example.category)} · {formatLabel[example.format]}</p>{example.href && <a className="showcase-visit" href={example.href} target="_blank" rel="noreferrer">Visit {example.logo ?? example.name} <ArrowUpRight size={13} strokeWidth={1.7} /></a>}</div>
    </div>
  </article>;
}

export const Route = createFileRoute("/examples")({
  validateSearch: z.object({ cat: z.string().optional(), format: z.coerce.number().optional() }),
  head: () => siteHead({ path: "/examples", title: "Video Ad Examples Made from Product Photos — Gravity Pants", description: "Browse Gravity Pants video ad examples across fashion, food, beauty, and home. Find a style for your photos.", image: EXAMPLES_OG_IMAGE }),
  loader: async () => {
    const [reels, content] = await Promise.all([listSiteReels().catch(() => [] as SiteReel[]), getHomepageContent().catch(() => DEFAULT_CONTENT)]);
    return { reels, content };
  },
  component: ExamplesPage,
});

function ExamplesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/examples" });
  const format = formats.some(f => f.id === String(search.format)) ? String(search.format) : undefined;
  const { reels, content } = Route.useLoaderData();
  const week = content.example;
  const weekVideo = featuredVideo(week.reelId, reels, week.photos.length);
  // Only real brand reels from /admin/reels are shown.
  const all = reels.map(reelToExample);
  // Category filters come from the reels themselves, so new admin categories appear here.
  const categories = [{ id: "all", label: "All" }, ...[...new Set(all.map((e) => e.category))].map((c) => ({ id: c, label: categoryLabel(c) }))];
  const cat = categories.some(c => c.id === search.cat) ? search.cat : undefined;
  const visible = all.filter(example => (!cat || example.category === cat) && (!format || example.format === format));
  return <SiteShell><div className="examples-page">
    <section className="examples-hero examples-container"><span className="site-eyebrow">Examples</span><div><h1>See what your<br />photos can become.</h1><p className="site-lede">Each example started with a few still photos. Choose a style you like and use it with your own products.</p></div></section>
    <section className="examples-featured examples-container" aria-label="Example of the week"><article className="site-card examples-featured-panel"><div className="examples-featured-copy"><div><span className="examples-badge">Example of the week</span><h2>{week.title}</h2><p>{week.description}</p></div><div className="examples-featured-bottom"><div className="examples-chips">{weekVideo.chips.map((c) => <span key={c}>{c}</span>)}</div><div className="examples-featured-actions"><Button asChild variant="siteSecondary" size="site"><a href="#gallery">Browse more examples</a></Button></div></div></div><div className="examples-featured-media"><div className="examples-featured-stills"><small>Original photos</small>{week.photos.map((photo, index) => <img key={index} src={photoSrc(photo)} alt={photo.alt || `Original photo ${index + 1}`} />)}</div><ArrowRight className="examples-featured-arrow" size={30} strokeWidth={1.7} /><div className="examples-featured-phone"><small>Video ad</small><FeaturedAdVideo tapToggle video={weekVideo.video} videoWebm={weekVideo.videoWebm} poster={weekVideo.poster} label={weekVideo.label} format={weekVideo.format} /></div></div></article></section>
    <section id="gallery" className="examples-gallery examples-container" aria-label="Examples gallery"><div className="examples-filters"><div className="examples-categories" role="group" aria-label="Filter by category">{categories.map(option => <Button key={option.id} type="button" variant="ghost" className="examples-filter-button" aria-pressed={(cat || "all") === option.id} onClick={() => navigate({ search: prev => ({ ...prev, cat: option.id === "all" ? undefined : option.id }), hash: "gallery", replace: true })}>{option.label}</Button>)}</div><div className="examples-filter-right"><span className="examples-count" aria-live="polite">{visible.length} {visible.length === 1 ? "example" : "examples"}</span><div className="examples-formats" role="group" aria-label="Filter by format">{formats.map(option => <Button key={option.id} type="button" variant="ghost" className="examples-filter-button" aria-pressed={(format || "all") === option.id} onClick={() => navigate({ search: prev => ({ ...prev, format: option.id === "all" ? undefined : Number(option.id) }), hash: "gallery", replace: true })}><span className="examples-format-long">{option.label}</span><span className="examples-format-short">{option.short}</span></Button>)}</div></div></div>
      {visible.length > 0 ? <div className="examples-grid">{visible.map(example => <GalleryCard key={example.id} example={example} />)}</div> : <div className="site-card examples-empty"><h2>No examples in this combination yet.</h2><Button variant="siteSecondary" size="site" onClick={() => navigate({ search: { cat: undefined, format: undefined }, hash: "gallery", replace: true })}>Show all examples</Button></div>}
    </section>
    <section className="examples-submit examples-container"><span>Want a reel like these for your brand?</span><Link to="/contact">Tell us about it <ArrowRight size={16} strokeWidth={1.7} /></Link></section>
    <section className="examples-closing examples-container"><div className="site-card examples-closing-inner"><div className="examples-closing-copy"><div className="examples-closing-logo"><GravityPantsLogo size={64} /></div><h2>Found a style you like?</h2><p>Use it with your own photos and change anything you want.</p><div><Button asChild variant="site" size="site"><Link to="/signup">Start free</Link></Button><Button asChild variant="siteSecondary" size="site"><Link to="/pricing">See pricing</Link></Button></div></div><div className="examples-closing-orbit" aria-hidden="true"><span /></div></div></section>
  </div></SiteShell>;
}