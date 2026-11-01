import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/privacy")({
  head: () => siteHead({ path: "/privacy", title: "Privacy policy — Gravity Pants", description: "How Gravity Pants collects, uses and protects your data." }),
  component: PrivacyPage,
});

const sections: { h: string; body: string[] }[] = [
  {
    h: "What we collect",
    body: [
      "Account details: your name and email address when you sign up.",
      "Your content: the photos you upload and the ads, brand kits and templates you create. These belong to you.",
      "Billing details: payments are handled by our payment provider; we never see or store your full card number.",
      "Usage basics: which features you use and technical logs that keep the service running and secure.",
      "Directory greetings: when hosting location information is unavailable, GeoJS estimates your country and city from your internet connection. Open-Meteo supplies weather for that approximate area. We do not request device location access or save your location to your account; these services receive the connection or approximate area needed for their lookup.",
    ],
  },
  {
    h: "How we use it",
    body: [
      "To provide the service: storing your photos and ads, rendering your exports, and keeping your account working.",
      "To bill you correctly and enforce plan limits.",
      "To reply when you contact support.",
      "To send service emails such as sign-up confirmation, password reset, receipts and trial reminders. You can opt out of anything that isn't essential.",
    ],
  },
  {
    h: "What we never do",
    body: [
      "We never sell your data.",
      "We never use your photos or finished reels to advertise our own product without your written permission.",
      "We never claim ownership of your content.",
    ],
  },
  {
    h: "Where your data lives",
    body: [
      "Your photos, ads and exports are stored privately in your workspace. Only you and the people you invite to your workspace can see them. Gravity Pants staff can only access your content when you open a support request, and every such access is logged.",
      "Exports are kept for 30 days and then deleted automatically.",
    ],
  },
  {
    h: "Your choices",
    body: [
      "You can download your exports at any time from the Export page.",
      "You can delete ads, photos and brand kits from the app whenever you like.",
      "To delete your account and all associated data, write to info@gravitypants.com and we'll take care of it.",
    ],
  },
  {
    h: "Advertising measurement and cookies",
    body: [
      "On Gravity Pants public pages, Meta Pixel measures page visits for Facebook and Instagram advertising. Meta receives the page address (without query parameters or fragments), advertising cookie identifiers and technical connection data such as IP address and browser information. We do not send account details, uploaded content, registrations or purchase events through this installation. Aimanté, private account pages, Shopify and embedded reel players do not load it.",
      "In regions requiring advertising consent, tracking remains off until you accept. Elsewhere it may run without a banner, subject to your saved refusal and browser opt-outs. Unresolved locations default to requiring consent. Ad clicks and impressions are reported by the advertising platforms regardless of your website choice.",
      "Cookie settings lets you accept, reject or withdraw advertising consent at any time. We keep a visitor reference, timestamps, region and the notice and choices shown in this browser, preserving earlier acceptance when you later withdraw. Changes apply to other open tabs on the same site. Clearing browser storage removes that local record. Withdrawal stops new advertising events; it does not undo data already received by Meta.",
    ],
  },
  {
    h: "Contact",
    body: ["Questions about this policy? Email info@gravitypants.com."],
  },
];

function PrivacyPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-[760px] px-5 pb-24 pt-16 md:pt-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">Legal</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[56px]">Privacy policy</h1>
        <p className="mt-4 text-[15px] text-site-muted">Last updated: November 2026</p>
        <p className="mt-6 text-[17px] leading-[1.5] text-site-secondary">Gravity Pants turns your photos into video ads. This policy explains what we collect, why, and the choices you have. The short version: your content is yours, we don't sell data, and we keep things private by default.</p>
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
