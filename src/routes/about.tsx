import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Gravity Pants" },
      { name: "description", content: "Why we built Gravity Pants: turning still photos into video ads for everyone who has better things to do than edit video." },
      { property: "og:title", content: "About — Gravity Pants" },
      { property: "og:description", content: "Why we built Gravity Pants: turning still photos into video ads for everyone who has better things to do than edit video." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    h: "Photos in, reels out",
    p: "You already have the photos. You take them every day. We think the distance between a good photo and a good video ad should be measured in minutes, not evenings.",
  },
  {
    h: "No timeline anxiety",
    p: "Most video tools hand you a timeline and wish you luck. We hand you a finished reel and let you tap anything to change it. Zero instruction, zero intimidation.",
  },
  {
    h: "Your brand, remembered",
    p: "Set your logo, colors and fonts once. Every ad starts with them. Work with a team? Share the kit, share templates, everyone stays on brand.",
  },
  {
    h: "Small team, real people",
    p: "Support replies come from the people who build the product. Team customers hear back within 6 hours; everyone else within 24.",
  },
];

const stats = [
  { n: "3", l: "photos to start an ad" },
  { n: "5 min", l: "from upload to finished reel" },
  { n: "3", l: "formats every time: 9:16, 1:1, 16:9" },
];

function AboutPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-[1248px] px-5 pb-16 pt-16 md:px-8 md:pt-24 lg:px-16 xl:px-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">About</p>
        <h1 className="mt-3 max-w-[820px] text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[64px] md:tracking-[-0.035em]">Video ads shouldn't need a video team.</h1>
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.45] text-site-secondary md:text-[21px]">Gravity Pants started with a simple observation: small businesses take great photos every day, then pay agencies to turn them into the videos their customers actually see. We built a tool that closes that gap.</p>
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
          <h2 className="mx-auto max-w-[640px] text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-site-ink md:text-[48px] md:tracking-[-0.035em]">Your next ad is three photos away.</h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[17px] leading-[1.45] text-site-secondary">Start with a 7-day free trial. Every feature, three exports, watermarked.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="site" size="site"><Link to="/signup">Start free trial</Link></Button>
            <Button asChild variant="siteSecondary" size="site"><Link to="/examples">Browse the gallery</Link></Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
