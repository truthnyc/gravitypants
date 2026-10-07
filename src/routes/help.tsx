import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { FAQ } from "@/lib/stillframe/plans-config";
import { Button } from "@/components/ui/button";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/help")({
  head: () => siteHead({ path: "/help", title: "Help & FAQ – Making Video Ads from Photos | Gravity Pants", description: "Answers about making video ads from product photos with Gravity Pants: MP4 and GIF exports, 9:16, 1:1 and 16:9 formats, brand kits, plans and billing." }),
  component: HelpPage,
});

const guides = [
  { q: "How do I make my first reel?", a: "Sign up, start a new ad and choose three to five photos. Gravity Pants puts them into a reel. Tap the words, colors or movement to make changes, then export your files." },
  { q: "Where do my exports go?", a: "Every finished export appears on the Export page under Previous exports and stays available to download for 30 days." },
  { q: "What counts as one export?", a: "One export is one reel, however many formats and files it produces. Export counts reset on each billing date." },
  { q: "Can I use my own fonts and logo?", a: "Yes. Add your logo, colors and fonts to a brand kit, then use it when you make a new ad. Every Google Font is included on all plans." },
  { q: "How do I work with my team?", a: "The Team plan lets you invite 4 teammates with shared brand kits, shared templates and 150 exports a month shared across the workspace. Invite people from Account → Team." },
  { q: "How do I change or cancel my plan?", a: "Go to Account → Billing to switch plans, update your card or cancel. Changes start right away; cancellations keep your access until the end of the paid period." },
];

const videoAds = [
  { q: "Can I make a video ad from product photos?", a: "Yes. That is what Gravity Pants is for. Choose three to five product photos and it builds a short video ad with movement, transitions, your text and your logo. You can change any part before exporting." },
  { q: "Which formats do I get for Instagram, TikTok and Facebook?", a: "Every reel exports in 9:16 for Reels, TikTok and Stories, 1:1 for feed posts and 16:9 for YouTube, websites and email, so one ad covers every placement." },
  { q: "Should I export an MP4 or a GIF?", a: "Use MP4 for social media ads and anywhere video plays. Use an animated GIF for email newsletters and places that do not play video. Gravity Pants makes both from the same ad, and they look the same." },
  { q: "Do I need video editing experience?", a: "No. Gravity Pants starts with a finished reel instead of an empty timeline. Tap the words, colors, photo framing or movement to change them." },
  { q: "Can my video ads match my brand?", a: "Yes. Save your logo, colors and fonts in a brand kit and every new ad starts with them. You can also add a light and a dark version of your logo and pick which one shows on each frame." },
  { q: "Can I try it before paying?", a: "Yes. The free trial has no time limit and needs no credit card. Your first reel exports with no watermark, and you get two more exports with a small Gravity Pants mark. Paid plans never add a watermark." },
];

function HelpPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-[1248px] px-5 pb-20 pt-16 md:px-8 md:pt-24 lg:px-16 xl:px-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">Help center</p>
        <h1 className="mt-3 max-w-[720px] text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[64px] md:tracking-[-0.035em]">How can we help?</h1>
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.45] text-site-secondary md:text-[21px]">Find answers about making ads, exporting files, plans and billing. If you still need help, send us a message and a person will reply.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="site" size="site"><a href="mailto:help@gravitypants.com">Contact support</a></Button>
          <Button asChild variant="siteSecondary" size="site"><Link to="/pricing">See pricing</Link></Button>
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

      <section className="mx-auto max-w-[1248px] px-5 pb-20 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">Making video ads from photos</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {videoAds.map((item) => (
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
