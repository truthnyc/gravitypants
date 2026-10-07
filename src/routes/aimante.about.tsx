import { createFileRoute, Link } from "@tanstack/react-router";
import { AimanteShell } from "@/components/site/AimanteShell";

export const Route = createFileRoute("/aimante/about")({
  head: () => ({
    meta: [
      { title: "About Aimanté — video ads by mood" },
      { name: "description", content: "Aimanté is a directory of short video ads from independent brands, browsable by mood, category and brand. By Gravity Pants." },
      { property: "og:title", content: "About Aimanté" },
      { property: "og:description", content: "A directory of short video ads from independent brands, browsable by mood. By Gravity Pants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <AimanteShell>
      <section className="mx-auto max-w-[720px] px-6 py-20 font-ap text-ap-ink">
        <h1 className="text-[clamp(34px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.03em]">About Aimanté</h1>
        <p className="mt-5 text-[18px] leading-[1.5] text-ap-body">
          Aimanté is a place to find brands by how they feel. Every reel here was made from still photos with Gravity Pants, and you can browse them by mood, category or brand.
        </p>
        <p className="mt-4 text-[18px] leading-[1.5] text-ap-body">Tell us your mood and we'll show you something.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/directory" className="inline-flex h-11 items-center rounded-lg bg-ap-blue px-5 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover">Browse reels</Link>
          <Link to="/aimante/join" className="inline-flex h-11 items-center rounded-lg bg-ap-panel px-5 text-[15px] font-medium text-ap-ink hover:bg-ap-hairline">List your brand</Link>
        </div>
      </section>
    </AimanteShell>
  );
}
