import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { listSiteReels } from "@/lib/site/reels.functions";
import { LAUNCH_FILM } from "@/lib/site/launch-film";
import { categoryLabel, type SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { stableMedia, videoObject } from "@/lib/site/video-schema";
import { FORMAT_SIZE, reelName, relatedReels, watchPath, watchSlugs } from "@/lib/site/watch";
import { AIMANTE_ORIGIN } from "@/lib/site/brand-site";

const wrap = "mx-auto w-full max-w-[1080px] px-5 md:px-8";

export const Route = createFileRoute("/reels/$slug")({
  loader: async ({ params }) => {
    const all = [...(await listSiteReels().catch(() => [] as SiteReel[])), LAUNCH_FILM];
    const slugs = watchSlugs(all);
    const reel = all.find((r) => slugs.get(r.id) === params.slug);
    if (!reel) throw notFound();
    const related = relatedReels(reel, all).map((r) => ({ reel: r, slug: slugs.get(r.id)! }));
    return { reel, slug: params.slug, related };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return siteHead({ path: watchPath(params.slug), title: "Reel not found | Gravity Pants", description: "This reel is no longer available.", noindex: true });
    const { reel, slug } = loaderData;
    const name = reelName(reel);
    const poster = stableMedia(reel, "poster");
    const video = stableMedia(reel, "video");
    const head = siteHead({
      path: watchPath(slug),
      title: `${name} | Gravity Pants`,
      description: (reel.description?.trim() || `A short video ad for ${reel.brand}, made from still photos with Gravity Pants.`).slice(0, 300),
      ...(poster ? { image: poster } : {}),
    });
    const size = FORMAT_SIZE[reel.format];
    const vo = videoObject(reel, slug);
    return {
      ...head,
      meta: [
        ...head.meta.filter((m) => !("property" in m && m.property === "og:type")),
        { property: "og:type", content: "video.other" },
        ...(video ? [
          { property: "og:video", content: video },
          { property: "og:video:secure_url", content: video },
          { property: "og:video:type", content: "video/mp4" },
          { property: "og:video:width", content: String(size.width) },
          { property: "og:video:height", content: String(size.height) },
        ] : []),
      ],
      scripts: [...head.scripts, ...(vo ? [{ type: "application/ld+json", children: JSON.stringify(vo) }] : [])],
    };
  },
  component: WatchPage,
  errorComponent: () => <SiteShell><div className={`${wrap} py-24`}><h1 className="text-[32px] font-semibold text-site-ink">This reel couldn't load.</h1><Link to="/reels" className="mt-4 inline-block text-site-link">See all reels</Link></div></SiteShell>,
  notFoundComponent: () => <SiteShell><div className={`${wrap} py-24`}><h1 className="text-[32px] font-semibold text-site-ink">Reel not found</h1><Link to="/reels" className="mt-4 inline-block text-site-link">See all reels</Link></div></SiteShell>,
});

function WatchPage() {
  const { reel, related } = Route.useLoaderData();
  const size = FORMAT_SIZE[reel.format];
  const tall = reel.format === "916";
  const seconds = Math.round(reel.seconds);
  return (
    <SiteShell>
      <article className={`${wrap} pb-20 pt-6 md:pt-10`}>
        <div className="grid w-full place-items-center rounded-lg bg-site-panel">
          <video
            className={`block rounded-lg bg-site-panel ${tall ? "h-[min(72svh,760px)] w-auto" : "w-full"}`}
            style={{ aspectRatio: `${size.width} / ${size.height}` }}
            src={reel.video}
            poster={reel.poster ?? undefined}
            width={size.width}
            height={size.height}
            controls
            playsInline
            preload="metadata"
            aria-label={reelName(reel)}
          >
            {reel.videoWebm && <source src={reel.videoWebm} type="video/webm" />}
            <source src={reel.video} type="video/mp4" />
          </video>
        </div>

        <h1 className="mt-8 max-w-[820px] text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-site-ink md:text-[44px]">{reelName(reel)}</h1>
        {reel.description?.trim() && <p className="mt-4 max-w-[720px] text-[17px] leading-[1.6] text-site-secondary">{reel.description.trim()}</p>}

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1">
          {reel.href && <a className="showcase-visit" href={reel.href} target="_blank" rel="noopener noreferrer">Visit {reel.brand} <ArrowUpRight size={13} strokeWidth={1.7} /></a>}
          {reel.brandSlug && <a className="showcase-visit" href={`${AIMANTE_ORIGIN}/b/${reel.brandSlug}`}>{reel.brand} on Aimanté <ArrowRight size={13} strokeWidth={1.7} /></a>}
        </div>

        <section className="mt-12 max-w-[720px]" aria-labelledby="made">
          <h2 id="made" className="text-[24px] font-semibold tracking-[-0.02em] text-site-ink">How this reel was made</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Photos used", reel.photos ? String(reel.photos) : "—"],
              ["Shape", size.label],
              ["Length", seconds ? `${seconds} sec` : "—"],
              ["Category", categoryLabel(reel.category)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[4px] bg-site-panel p-4">
                <dt className="text-[13px] text-site-muted">{k}</dt>
                <dd className="mt-1 text-[17px] font-semibold tabular-nums text-site-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[15px] leading-[1.6] text-site-secondary">
            Made in Gravity Pants from {reel.photos || "a few"} still {reel.photos === 1 ? "photo" : "photos"}, with {reel.brand}'s fonts, colours and logo from its brand kit and gentle photo movement between frames.
          </p>
          <Button asChild variant="site" size="site" className="mt-6">
            <a href="/signup?ref=watch" data-cta="watch-signup">Make a reel like this</a>
          </Button>
        </section>

        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="more">
            <h2 id="more" className="text-[24px] font-semibold tracking-[-0.02em] text-site-ink">More reels</h2>
            <ul className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
              {related.map(({ reel: r, slug }) => (
                <li key={r.id}>
                  <Link to="/reels/$slug" params={{ slug }} className="group block">
                    <div className="grid aspect-square place-items-center overflow-hidden rounded-[4px] bg-site-panel">
                      {r.poster && <img src={r.poster} alt={`${r.brand} reel thumbnail`} loading="lazy" width={FORMAT_SIZE[r.format].width} height={FORMAT_SIZE[r.format].height} className="h-[86%] w-auto rounded-[4px] object-contain" />}
                    </div>
                    <p className="mt-3 text-[15px] text-site-ink group-hover:text-site-link">{r.brand}<span className="text-site-muted"> · {r.displayTitle?.trim() || r.title}</span></p>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/reels" className="showcase-visit mt-4">See all reels <ArrowRight size={13} strokeWidth={1.7} /></Link>
          </section>
        )}
      </article>
    </SiteShell>
  );
}
