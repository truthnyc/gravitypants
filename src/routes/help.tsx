import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { FAQ } from "@/lib/stillframe/plans-config";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help center — Gravity Pants" },
      { name: "description", content: "Answers to common questions about Gravity Pants: plans, exports, formats, billing and getting started." },
      { property: "og:title", content: "Help center — Gravity Pants" },
      { property: "og:description", content: "Answers to common questions about Gravity Pants: plans, exports, formats, billing and getting started." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

const guides = [
  { q: "How do I make my first reel?", a: "Sign up, start a new ad and pick three to five photos. Gravity Pants builds the reel for you — change the words, colors and movement by tapping anything on the screen, then export." },
  { q: "Where do my exports go?", a: "Every finished export appears on the Export page under Previous exports and stays available to download for 30 days." },
  { q: "What counts as one export?", a: "One export is one reel, however many formats and files it produces. Export counts reset on each billing date." },
  { q: "Can I use my own fonts and logo?", a: "Yes. Set up your brand kit with your logo, colors and fonts once, and every new ad starts with them. Every Google Font is included on all plans." },
  { q: "How do I work with my team?", a: "The Team plan gives you 3 seats with shared brand kits, shared templates and 150 exports a month shared across the workspace. Invite people from Account → Team." },
  { q: "How do I change or cancel my plan?", a: "Go to Account → Billing to switch plans, update your card or cancel. Changes start right away; cancellations keep your access until the end of the paid period." },
];

function HelpPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-[1248px] px-5 pb-20 pt-16 md:px-8 md:pt-24 lg:px-16 xl:px-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">Help center</p>
        <h1 className="mt-3 max-w-[720px] text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[64px] md:tracking-[-0.035em]">How can we help?</h1>
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.45] text-site-secondary md:text-[21px]">Quick answers about plans, exports and getting started. Can't find what you need? Write to us — a person replies.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="site" size="site"><a href="mailto:help@gravitypants.com">Contact support</a></Button>
          <Button asChild variant="siteSec" size="site"><Link to="/pricing">See pricing</Link></Button>
        </div>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-20 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">Getting started</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {guides.map((item) => (
            <div key={item.q} className="rounded-[24px] bg-site-panel p-6 md:p-8">
              <h3 className="text-[17px] font-semibold text-site-ink">{item.q}</h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-site-secondary">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-24 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">Frequently asked questions</h2>
        <div className="mt-8 flex flex-col gap-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-[16px] bg-site-panel px-6 py-5">
              <summary className="cursor-pointer list-none text-[17px] font-semibold text-site-ink">{item.q}</summary>
              <p className="mt-3 text-[15px] leading-[1.5] text-site-secondary">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-[15px] text-site-secondary">Still stuck? Email <a href="mailto:help@gravitypants.com" className="text-site-primary">help@gravitypants.com</a> — Team customers get priority replies within 6 hours, everyone else within 24 hours.</p>
      </section>
    </SiteShell>
  );
}
