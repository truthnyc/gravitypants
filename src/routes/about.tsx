import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/about")({
  head: () => siteHead({ path: "/about", title: "About Gravity Pants – The Photo-to-Video Ad Maker", description: "Gravity Pants is a video ad maker that turns product photos into MP4 video ads and animated GIFs for Instagram, TikTok and Facebook, with no editing skills needed." }),
  component: AboutPage,
});

const values = [
  {
    h: "Photos in, reels out",
    p: "You already have the photos. Turning them into a useful video ad should take a few minutes, not a free evening.",
  },
  {
    h: "No timeline anxiety",
    p: "Most video tools begin with an empty timeline. Gravity Pants starts with a reel you can play, then lets you tap the parts you want to change.",
  },
  {
    h: "Your brand, remembered",
    p: "Save your logo, colors and fonts once. Use the same brand kit and templates across your team, so each ad starts with the right look.",
  },
  {
    h: "Small team, real people",
    p: "Support replies come from the people who build the product. Team customers hear back within 6 hours; everyone else within 24.",
  },
];

const stats = [
  { n: "3", l: "photos to start an ad" },
  { n: "Minutes", l: "from photos to a finished reel" },
  { n: "4", l: "export shapes: Vertical, Portrait, Square and Landscape — plus custom sizes" },
];

function AboutPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-[1248px] px-5 pb-16 pt-16 md:px-8 md:pt-24 lg:px-16 xl:px-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">About</p>
        <h1 className="mt-3 max-w-[820px] text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[64px] md:tracking-[-0.035em]">Video ads shouldn't need a video team.</h1>
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.45] text-site-secondary md:text-[21px]">Small businesses already take good product photos. We built Gravity Pants so they can turn those photos into video ads without hiring an editor or learning video software.</p>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-16 md:px-8 lg:px-16 xl:px-24">
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.l} className="rounded-[24px] bg-site-panel p-6 md:p-8">
              <p className="text-[44px] font-semibold leading-none tracking-[-0.03em] text-site-ink tabular-nums md:text-[56px]">{s.n}</p>
              <p className="mt-3 text-[15px] leading-[1.5] text-site-secondary">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-16 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">What Gravity Pants does</h2>
        <div className="mt-6 grid max-w-[820px] gap-5 text-[17px] leading-[1.6] text-site-secondary">
          <p>Gravity Pants is an online video ad maker for small brands and shops. You upload a few product photos, and it turns them into a short video ad with movement, transitions, text and your logo. There is no timeline to learn and nothing to install.</p>
          <p>Every ad exports as an MP4 video and, when you need one, an animated GIF. Pick the shapes you need: Vertical 9:16 for Instagram Reels, TikTok and Stories; Portrait 4:5, recommended for Instagram, Facebook and LinkedIn feeds; Square 1:1 for square posts; Landscape 16:9 for YouTube, websites and email; or a custom size. One file per shape works everywhere listed for it.</p>
          <p>Brand kits keep your logo, colors and fonts in one place, so every new ad already looks like yours. Templates give you a ready-made style to start from, and you can save your own to reuse for the next product launch, sale or seasonal collection.</p>
          <p>Gravity Pants works well for product launches, restocks, new collections, gift guides and sale announcements, anywhere a still photo would do better as a few seconds of motion.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-16 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">What we believe</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {values.map((v) => (
            <div key={v.h} className="rounded-[24px] bg-site-panel p-6 md:p-8">
              <h3 className="text-[17px] font-semibold text-site-ink">{v.h}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-site-secondary">{v.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-24 md:px-8 lg:px-16 xl:px-24">
        <div className="rounded-[24px] bg-site-panel p-8 text-center md:p-16">
          <h2 className="mx-auto max-w-[640px] text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-site-ink md:text-[48px] md:tracking-[-0.035em]">Try it with photos you already have.</h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[17px] leading-[1.45] text-site-secondary">The free trial includes every feature, and your first reel has no watermark.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="site" size="site"><Link to="/signup">Start free trial</Link></Button>
            <Button asChild variant="siteSecondary" size="site"><Link to="/examples">Browse the gallery</Link></Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
