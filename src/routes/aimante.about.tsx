import { createFileRoute, Link } from "@tanstack/react-router";
import { aimanteHead } from "@/lib/site/brand-site";
import { AimanteShell } from "@/components/site/AimanteShell";

export const Route = createFileRoute("/aimante/about")({
  head: () => aimanteHead({ path: "/about", title: "About Aimanté — video ads by mood", description: "Aimanté is a directory of short video ads from independent brands, browsable by mood, category and brand. By Gravity Pants." }),
  component: About,
});

function About() {
  return (
    <AimanteShell>
      <section className="mx-auto max-w-[720px] px-6 py-20 font-ap text-ap-ink">
        <h1 className="text-[clamp(34px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.03em]">About Aimanté</h1>
        <p className="mt-5 text-[18px] leading-[1.5] text-ap-body">
          Aimanté brings together short video ads from brands. Browse by mood, category or brand, and visit a brand's website when something catches your eye.
        </p>
        <p className="mt-4 text-[18px] leading-[1.5] text-ap-body">Aimanté is by Gravity Pants, which turns still photos into short video ads and GIFs.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/directory" className="inline-flex h-11 items-center rounded-lg bg-ap-blue px-5 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover">Browse reels</Link>
          <Link to="/aimante/join" className="inline-flex h-11 items-center rounded-lg bg-ap-panel px-5 text-[15px] font-medium text-ap-ink hover:bg-ap-hairline">List your brand</Link>
        </div>
      </section>
    </AimanteShell>
  );
}
