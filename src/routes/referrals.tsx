import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Link2, Gift, Download, Check } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { siteHead } from "@/lib/site/seo";
import { REFERRAL_NOTE } from "@/lib/stillframe/plans-config";
import exportScreenshot from "@/assets/guide/export.webp.asset.json";

export const Route = createFileRoute("/referrals")({
  head: () => {
    const head = siteHead({ path: "/referrals", title: "Give a Reel, Get a Reel | Gravity Pants", description: "Share your referral link and earn free exports with no watermark." });
    // This guide has no hero or cover photo; let hosting supply its share preview.
    return { ...head, meta: head.meta.filter((tag) => !("property" in tag && (tag.property === "og:image" || tag.property === "og:image:alt")) && !("name" in tag && tag.name === "twitter:image")) };
  },
  component: ReferralPage,
});

const steps = [
  { icon: Link2, title: "Copy your personal link", text: "Sign in and open Account → Billing. In the “Give a reel, get a reel” card, choose Copy link. Send that exact link in an email, a message or a social post — keep the referral code in the address." },
  { icon: Gift, title: "Your friend makes their first reel", text: "Your friend follows your link and creates a new account. They choose their photos, make a reel and finish their first export. Signing up alone doesn’t earn a credit; the first export is what counts." },
  { icon: Download, title: "You get a clean export", text: "After their first export finishes, you receive one free export with no watermark. Check your available referral credits in Account → Billing, then make and export your next reel." },
];

function ReferralPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1120px] px-5 md:px-8 lg:px-16">
        <section className="pb-12 pt-12 md:pb-16 md:pt-20">
          <p className="text-[15px] font-semibold text-site-eyebrow">Gravity Pants referrals</p>
          <h1 className="mt-4 max-w-[800px] text-[40px] font-semibold leading-[1.1] text-site-ink md:text-[64px]">Give a reel,<br />get a reel.</h1>
          <p className="mt-6 max-w-[680px] text-[18px] leading-relaxed text-site-secondary">{REFERRAL_NOTE.replace(/^Give a reel, get a reel\. /, "")}</p>
          <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
            <Button asChild variant="site" size="site"><Link to="/app/account/billing">Get my referral link <ArrowRight size={18} strokeWidth={1.7} /></Link></Button>
            <Button asChild variant="siteSecondary" size="site"><Link to="/signup">Create an account</Link></Button>
          </div>
          <p className="mt-4 text-[14px] text-site-secondary">Already have an account? Sign in to see your personal link.</p>
        </section>

        <section className="border-t border-site-hairline py-12 md:py-16" aria-labelledby="referral-steps">
          <h2 id="referral-steps" className="text-[28px] font-semibold text-site-ink md:text-[36px]">Three steps. One more reel.</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <li key={title}>
                <div className="flex items-center gap-3 text-site-primary"><Icon size={24} strokeWidth={1.7} /><span className="text-[14px] font-semibold tabular-nums">0{index + 1}</span></div>
                <h3 className="mt-4 text-[20px] font-semibold leading-snug text-site-ink">{title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-site-secondary">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-site-hairline py-12 md:py-16" aria-labelledby="clean-reels">
          <h2 id="clean-reels" className="text-[28px] font-semibold text-site-ink md:text-[36px]">Export without the watermark</h2>
          <div className="mt-5 max-w-[720px] space-y-4 text-[16px] leading-relaxed text-site-secondary">
            <p>Open your reel, make your edits and go to Export. Choose your sizes and MP4, GIF or both, then finish the export. Referral credits are applied automatically when an extra clean export is needed — there’s no coupon to enter.</p>
            <p>On the Free plan, your first included export is already clean. Referral credits let you make additional clean reels without upgrading. Paid plans already export without a watermark; a referral credit gives you an extra export when your included allowance runs out.</p>
            <p>One credit covers one reel export, even if you choose several sizes or both MP4 and GIF. It doesn’t unlock paid-only features: HTML5 remains on Business and Team.</p>
          </div>
          <figure className="mt-8 overflow-hidden rounded-sm border border-site-hairline">
            <img src={exportScreenshot.url} alt="Gravity Pants Export screen with a reel preview, export sizes and MP4 and GIF choices." width={1440} height={870} loading="lazy" className="block h-auto w-full" />
          </figure>
          <p className="mt-4 text-[14px] leading-relaxed text-site-secondary">Finished files are in Previous exports and remain available to download for 30 days.</p>
        </section>

        <section className="border-t border-site-hairline py-12 md:py-16" aria-labelledby="credit-tracking">
          <h2 id="credit-tracking" className="text-[28px] font-semibold text-site-ink md:text-[36px]">Keep track of your credits</h2>
          <p className="mt-5 max-w-[680px] text-[16px] leading-relaxed text-site-secondary">Account → Billing shows your personal link, available free exports from referrals and how many friends have completed their first export. If someone has only signed up, their reward is still waiting for that first export.</p>
          <ul className="mt-6 space-y-3 text-[16px] text-site-ink">
            <li className="flex gap-3"><Check className="shrink-0 text-site-primary" size={20} strokeWidth={1.7} />One friend’s first completed export earns one credit.</li>
            <li className="flex gap-3"><Check className="shrink-0 text-site-primary" size={20} strokeWidth={1.7} />Your friend starts on Free: no card and no time limit.</li>
            <li className="flex gap-3"><Check className="shrink-0 text-site-primary" size={20} strokeWidth={1.7} />A referral credit means a reel without a Gravity Pants watermark.</li>
          </ul>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
            <Button asChild variant="site" size="site"><Link to="/app/account/billing">Open Account → Billing</Link></Button>
            <Button asChild variant="siteSecondary" size="site"><Link to="/help">More help</Link></Button>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}