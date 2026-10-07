import { createFileRoute, Link } from "@tanstack/react-router";
import { AimanteShell } from "@/components/site/AimanteShell";

export const Route = createFileRoute("/aimante/join")({
  head: () => ({
    meta: [
      { title: "List your brand — Aimanté" },
      { name: "description", content: "Get your brand's reels into Aimanté, the directory of video ads browsable by mood, category and brand." },
      { property: "og:title", content: "List your brand — Aimanté" },
      { property: "og:description", content: "Get your brand's reels into Aimanté, browsable by mood, category and brand." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Join,
});

function Join() {
  return (
    <AimanteShell>
      <section className="mx-auto max-w-[720px] px-6 py-20 font-ap text-ap-ink">
        <h1 className="text-[clamp(34px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.03em]">List your brand on Aimanté</h1>
        <p className="mt-5 text-[18px] leading-[1.5] text-ap-body">
          Aimanté shows short video ads by mood, category and brand. Make your reels with Gravity Pants, then share them to the directory from the Share step — your brand gets its own page.
        </p>
        <ol className="mt-8 space-y-3 text-[16px] text-ap-body">
          <li><b className="text-ap-ink">1.</b> Turn your product photos into reels with Gravity Pants.</li>
          <li><b className="text-ap-ink">2.</b> Choose your brand, category and moods when you share.</li>
          <li><b className="text-ap-ink">3.</b> Your reels appear here once they're live.</li>
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href="https://gravitypants.com/signup" className="inline-flex h-11 items-center rounded-lg bg-ap-blue px-5 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover">Start with Gravity Pants</a>
          <Link to="/contact" className="inline-flex h-11 items-center rounded-lg bg-ap-panel px-5 text-[15px] font-medium text-ap-ink hover:bg-ap-hairline">Ask us a question</Link>
        </div>
      </section>
    </AimanteShell>
  );
}
