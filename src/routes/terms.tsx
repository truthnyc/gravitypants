import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — Gravity Pants" },
      { name: "description", content: "The terms that govern your use of Gravity Pants." },
      { property: "og:title", content: "Terms of service — Gravity Pants" },
      { property: "og:description", content: "The terms that govern your use of Gravity Pants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const sections: { h: string; body: string[] }[] = [
  {
    h: "The service",
    body: [
      "Gravity Pants turns your still photos into short video ads and animated GIFs. New accounts start with a 7-day free trial with 3 exports; paid plans add more exports, seats and sharing features as described on the Pricing page.",
    ],
  },
  {
    h: "Your content",
    body: [
      "You keep full ownership of the photos you upload and the reels you export. You may use your exports anywhere, for any purpose, forever — including reels made during the free trial.",
      "You promise that you have the right to use the photos and logos you upload. Don't upload content that is unlawful, misleading or infringes someone else's rights.",
    ],
  },
  {
    h: "Plans and billing",
    body: [
      "Paid plans renew automatically each month or year until you cancel. Prices are in US dollars; taxes may apply.",
      "One export is one reel, however many formats and files it produces. Export counts reset on each billing date and don't roll over.",
      "You can switch plans or cancel at any time from Account → Billing. When you cancel, you keep full access until the end of the period you've already paid for; we don't refund partial periods.",
    ],
  },
  {
    h: "Fair use",
    body: [
      "Don't abuse the service: no automated scraping, no reselling access to your account, and no attempting to break plan limits or security measures. We may suspend accounts that do.",
    ],
  },
  {
    h: "Availability and liability",
    body: [
      "We work hard to keep Gravity Pants available and your data safe, but we can't promise the service will always be uninterrupted. To the extent the law allows, Gravity Pants is not liable for indirect losses such as lost profits, and our total liability is limited to the amount you paid us in the 12 months before the claim.",
    ],
  },
  {
    h: "Changes",
    body: [
      "If we change these terms in a way that matters, we'll email you before the change takes effect. Continuing to use Gravity Pants after that means you accept the new terms.",
    ],
  },
  {
    h: "Contact",
    body: ["Questions about these terms? Email info@gravitypants.com."],
  },
];

function TermsPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-[760px] px-5 pb-24 pt-16 md:pt-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">Legal</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[56px]">Terms of service</h1>
        <p className="mt-4 text-[15px] text-site-muted">Last updated: September 2026</p>
        <p className="mt-6 text-[17px] leading-[1.5] text-site-secondary">These terms govern your use of Gravity Pants. We've written them in plain language; by using the service you agree to them.</p>
        {sections.map((s) => (
          <section key={s.h} className="mt-10">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-site-ink">{s.h}</h2>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[1.55] text-site-secondary">
              {s.body.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </section>
        ))}
      </article>
    </SiteShell>
  );
}
