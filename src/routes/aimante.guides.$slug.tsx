import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AIMANTE_ORIGIN, aimanteHead } from "@/lib/site/brand-site";
import { AimanteShell, AimanteNotFound } from "@/components/site/AimanteShell";
import { getGuide } from "@/lib/directory/guides.functions";
import { seasonNote } from "@/lib/directory/guides";

export const Route = createFileRoute("/aimante/guides/$slug")({
  loader: async ({ params }) => {
    const guide = await getGuide({ data: { slug: params.slug } });
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData, params }) => {
    const g = loaderData?.guide;
    if (!g) return { meta: [{ title: "Page not found — Aimanté" }, { name: "robots", content: "noindex, follow" }] };
    const path = `/guides/${params.slug}`;
    const head = aimanteHead({ path, title: g.seo_title, description: g.meta_description || g.intro.slice(0, 155), ...(g.cover ? { image: g.cover } : {}) });
    const brands = g.sections.flatMap((s) => s.brands).filter((b, i, a) => a.findIndex((x) => x.id === b.id) === i);
    const ld = [
      { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.meta_description, datePublished: g.published_at, dateModified: g.updated_at, mainEntityOfPage: `${AIMANTE_ORIGIN}${path}`, ...(g.cover ? { image: g.cover } : {}), publisher: { "@type": "Organization", name: "Aimanté", url: `${AIMANTE_ORIGIN}/`, logo: { "@type": "ImageObject", url: `${AIMANTE_ORIGIN}/apple-touch-icon.png` } } },
      { "@context": "https://schema.org", "@type": "ItemList", name: g.title, numberOfItems: brands.length, itemListElement: brands.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, url: `${AIMANTE_ORIGIN}/b/${b.slug}` })) },
    ];
    return { ...head, meta: [...(head.meta ?? []).filter((m: { property?: string }) => m.property !== "og:type"), { property: "og:type", content: "article" }], scripts: ld.map((x) => ({ type: "application/ld+json", children: JSON.stringify(x) })) };
  },
  errorComponent: () => <AimanteShell><p className="py-20 text-center font-ap">This guide couldn't load. Try again.</p></AimanteShell>,
  notFoundComponent: () => <AimanteNotFound />,
  component: Guide,
});

function Guide() {
  const { guide: g } = Route.useLoaderData();
  // Season note depends on today's date; compute after hydration so server and browser agree.
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setNote(seasonNote(g, new Date())), [g]);
  return (
    <AimanteShell>
      <article className="font-ap text-ap-ink">
        <header className="mx-auto max-w-[760px] px-6 pb-8 pt-16">
          <p className="text-[13px] font-medium"><Link to="/aimante/guides" className="text-ap-blue hover:underline">Guides</Link></p>
          <h1 className="mt-3 text-[clamp(32px,4.2vw,52px)] font-semibold leading-[1.08] tracking-[-0.035em]">{g.title}</h1>
          {note && <p className="mt-4 inline-block rounded-lg bg-ap-panel px-3 py-1.5 text-[14px] text-ap-body tabular-nums">{note}</p>}
          <div className="mt-6 grid gap-4 text-[18px] leading-[1.55] text-ap-body">{g.intro.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>
        </header>

        {g.sections.map((s) => (
          <section key={s.heading} className="mx-auto max-w-[1200px] px-6 pb-14">
            <div className="mx-auto max-w-[760px]">
              <h2 className="text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.02em]">{s.heading}</h2>
              {s.body && <p className="mt-2 text-[16px] leading-[1.5] text-ap-body">{s.body}</p>}
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {s.brands.map((b) => (
                <li key={b.id}>
                  <Link to="/directory/$slug" params={{ slug: b.slug }} className="group block h-full overflow-hidden rounded-[12px] bg-ap-panel hover:shadow-ap-soft">
                    <div className="aspect-[4/5] overflow-hidden bg-ap-hairline">
                      {b.poster && <img src={b.poster} alt={`${b.name} reel thumbnail`} loading="lazy" className="size-full object-cover" />}
                    </div>
                    <div className="p-4">
                      <p className="text-[12px] text-ap-muted">{b.category}</p>
                      <h3 className="mt-0.5 text-[16px] font-semibold group-hover:text-ap-blue">{b.name}</h3>
                      {b.why && <p className="mt-1.5 text-[14px] leading-[1.45] text-ap-body">{b.why}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {g.moods.length > 0 && (
          <section className="mx-auto max-w-[760px] px-6 pb-12">
            <h2 className="text-[20px] font-semibold">Browse by mood</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {g.moods.map((m) => <Link key={m} to="/directory" search={{ mood: m } as never} className="inline-flex h-10 items-center rounded-lg bg-ap-panel px-4 text-[15px] font-medium capitalize hover:text-ap-blue">{m}</Link>)}
            </div>
          </section>
        )}

        {g.related.length > 0 && (
          <section className="mx-auto max-w-[760px] px-6 pb-24">
            <h2 className="text-[20px] font-semibold">Related guides</h2>
            <ul className="mt-4 grid gap-3">
              {g.related.map((r) => <li key={r.slug}><Link to="/aimante/guides/$slug" params={{ slug: r.slug }} className="text-[16px] font-medium text-ap-blue hover:underline">{r.title} →</Link></li>)}
            </ul>
          </section>
        )}
      </article>
    </AimanteShell>
  );
}
