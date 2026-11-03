import { createFileRoute, Link } from "@tanstack/react-router";
import { aimanteHead } from "@/lib/site/brand-site";
import { AimanteShell } from "@/components/site/AimanteShell";
import { listGuides } from "@/lib/directory/guides.functions";

export const Route = createFileRoute("/aimante/guides/")({
  loader: async () => ({ guides: await listGuides().catch(() => []) }),
  head: () => aimanteHead({ path: "/guides", title: "Gift guides by mood — Aimanté", description: "Gift and mood guides from Aimanté. Cozy, playful and seasonal ideas from independent makers and well-known houses, shown in short reels." }),
  errorComponent: () => <AimanteShell><p className="py-20 text-center font-ap">Guides couldn't load. Try again.</p></AimanteShell>,
  notFoundComponent: () => <AimanteShell><p className="py-20 text-center font-ap">No guides yet.</p></AimanteShell>,
  component: Guides,
});

const firstPara = (s: string) => s.split(/\n\s*\n/)[0] ?? "";

function Guides() {
  const { guides } = Route.useLoaderData();
  return (
    <AimanteShell>
      <div className="font-ap text-ap-ink">
        <section className="mx-auto max-w-[760px] px-6 pb-10 pt-20 text-center">
          <h1 className="text-[clamp(34px,4.4vw,56px)] font-semibold leading-[1.05] tracking-[-0.035em]">Guides</h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[18px] leading-[1.5] text-ap-body">Gift ideas by mood and by season. Each one is a short list of brands we think fit, shown in their own reels.</p>
        </section>
        <section className="mx-auto max-w-[1200px] px-6 pb-24">
          {guides.length === 0 ? <p className="text-center text-ap-muted">New guides are on their way.</p> : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link to="/aimante/guides/$slug" params={{ slug: g.slug }} className="group block overflow-hidden rounded-[12px] bg-ap-panel hover:shadow-ap-soft">
                    <div className="aspect-[4/3] overflow-hidden bg-ap-hairline">
                      {g.cover && <img src={g.cover} alt="" aria-hidden loading="lazy" className="size-full object-cover transition-transform motion-reduce:transition-none group-hover:scale-[1.02]" />}
                    </div>
                    <div className="p-5">
                      <h2 className="text-[19px] font-semibold leading-snug group-hover:text-ap-blue">{g.title}</h2>
                      <p className="mt-2 line-clamp-3 text-[15px] leading-[1.5] text-ap-body">{firstPara(g.intro)}</p>
                      <span className="mt-3 inline-block text-[14px] font-medium text-ap-blue">Read the guide →</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AimanteShell>
  );
}
