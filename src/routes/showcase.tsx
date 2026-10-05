import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelVideo } from "@/components/site/ReelVideo";
import { SiteReelHeart, ReelRatioChip } from "@/components/site/SiteReelHeart";
import { Button } from "@/components/ui/button";
import { SHOWCASE_OG_IMAGE, siteHead } from "@/lib/site/seo";
import { listSiteReels } from "@/lib/site/reels.functions";
import { FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";

export const Route = createFileRoute("/showcase")({
  head: () =>
    siteHead({
      path: "/showcase",
      title: "Showcase — Brands on Gravity Pants",
      description:
        "Real video ads made with Gravity Pants by brands like Purl Soho, Aro, Agnona, Sachajuan and Katherine Grover.",
      image: SHOWCASE_OG_IMAGE,
    }),
  loader: () => listSiteReels().catch(() => [] as SiteReel[]),
  component: Showcase,
});

function BrandCard({ reel }: { reel: SiteReel }) {
  const media = (
    <div className={`examples-reel examples-reel-${reel.format}`}>
      <ReelVideo
        className="examples-reel-video"
        video={reel.video}
        videoWebm={reel.videoWebm ?? undefined}
        poster={reel.poster ?? undefined}
        label={`${reel.title} video ad by ${reel.brand}`}
      />
    </div>
  );
  return (
    <article className="examples-card showcase-card">
      <div className="examples-card-media">
        <ReelRatioChip label={FORMAT_LABEL[reel.format]} />
        <SiteReelHeart reelId={reel.id} name={`${reel.brand} reel`} />
        {reel.href ? (
          <a
            className="site-reel-link"
            href={reel.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Visit ${reel.brand}`}
          >
            {media}
          </a>
        ) : (
          media
        )}
      </div>
      <div className="examples-card-info">
        <div>
          <h3>{reel.brand}</h3>
          <p>
            {reel.title} · {FORMAT_LABEL[reel.format]} · {reel.seconds} sec
          </p>
          {reel.href && (
            <a className="showcase-visit" href={reel.href} target="_blank" rel="noreferrer">
              Visit {reel.brand} <ArrowUpRight size={15} strokeWidth={1.7} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Showcase() {
  const reels = Route.useLoaderData();
  return (
    <SiteShell>
      <div className="examples-page">
        <section className="examples-hero examples-container">
          <span className="site-eyebrow">Showcase</span>
          <div>
            <h1>
              Making reels
              <br />
              for your brand.
            </h1>
            <p className="site-lede">Each reel starts as a few product photos. Tap a reel to visit the brand.</p>
          </div>
        </section>
        <section className="examples-gallery examples-container" aria-label="Brand reels">
          {reels.length > 0 ? (
            <div className="examples-grid">
              {reels.map((r) => (
                <BrandCard key={r.id} reel={r} />
              ))}
            </div>
          ) : (
            <div className="site-card examples-empty">
              <h2>New brand reels are on their way.</h2>
            </div>
          )}
        </section>
        <section className="examples-closing examples-container">
          <div className="site-card examples-closing-inner">
            <div className="examples-closing-copy">
              <h2>Want your brand here?</h2>
              <p>Tell us about your products and we'll get back to you about a reel.</p>
              <div>
                <Button asChild variant="site" size="site">
                  <Link to="/contact">
                    Get in touch <ArrowRight size={18} strokeWidth={1.7} />
                  </Link>
                </Button>
                <Button asChild variant="siteSecondary" size="site">
                  <Link to="/signup">Make your own</Link>
                </Button>
              </div>
            </div>
            <div className="examples-closing-orbit" aria-hidden="true">
              <span />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
