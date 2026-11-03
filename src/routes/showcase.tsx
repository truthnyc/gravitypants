import { BrandProfileLink } from "@/components/site/BrandPreview";
import { ConceptReelNotice } from "@/components/directory/ConceptReelNotice";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelVideo } from "@/components/site/ReelVideo";
import { Button } from "@/components/ui/button";
import { SHOWCASE_OG_IMAGE, siteHead } from "@/lib/site/seo";
import { videoObjects } from "@/lib/site/video-schema";
import { listSiteReels } from "@/lib/site/reels.functions";
import { FORMAT_LABEL, ratioToFormat, type SiteReel } from "@/lib/site/reels";
import { useState } from "react";

export const Route = createFileRoute("/showcase")({
  head: ({ loaderData }) => {
    const head = siteHead({
      path: "/showcase",
      title: "Showcase — Brands on Gravity Pants",
      description:
        "Real video ads made with Gravity Pants by brands like Purl Soho, Aro, Agnona, Sachajuan and Katherine Grover.",
      image: SHOWCASE_OG_IMAGE,
    });
    return { ...head, scripts: [...head.scripts, ...videoObjects(loaderData ?? [], "/showcase").map((v) => ({ type: "application/ld+json", children: JSON.stringify(v) }))] };
  },
  loader: () => listSiteReels().catch(() => [] as SiteReel[]),
  component: Showcase,
});

function BrandCard({ reel }: { reel: SiteReel }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const thumb = ratio ? ratioToFormat(ratio) : reel.format;
  const media = (
    <div className={`examples-reel examples-reel-${thumb}`}>
      <ReelVideo
        className="examples-reel-video"
        video={reel.video}
        videoWebm={reel.videoWebm ?? undefined}
        poster={reel.poster ?? undefined}
        label={`${reel.title} video ad by ${reel.brand}`}
        onRatio={setRatio}
      />
    </div>
  );
  return (
    <article className="examples-card showcase-card">
      <div className="examples-card-media">
        {reel.href ? (

          <a
            className="site-reel-link"
            href={reel.href}
            target="_blank"
            rel="noopener noreferrer"
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
          <ConceptReelNotice brandName={reel.brand} brandSlug={reel.brandSlug} />
          {reel.brandSlug && (
            <BrandProfileLink className="showcase-visit" slug={reel.brandSlug} cta="showcase-brand-profile">
              About {reel.brand} <ArrowRight size={15} strokeWidth={1.7} />
            </BrandProfileLink>
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
              Brands that make
              <br />
              their reels here.
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
                  <Link to="/contact" search={{ topic: "brand-reel" }} data-cta="commission-reel">
                    Commission a reel <ArrowRight size={18} strokeWidth={1.7} />
                  </Link>
                </Button>
                <Button asChild variant="siteSecondary" size="site">
                  <Link to="/signup" data-cta="make-first-reel">Make your first reel</Link>
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
