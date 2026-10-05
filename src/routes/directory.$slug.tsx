import { createFileRoute, notFound, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { DirectoryGrid, ReelDetail } from "@/components/directory/DirectoryGrid";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { getBrandPage } from "@/lib/directory/directory.functions";
import type { DirectoryCard } from "@/lib/directory/directory";
import { BrandActions } from "@/components/directory/BrandActions";
import { siteHead } from "@/lib/site/seo";

const ORIGIN = "https://gravitypants.com";

export const Route = createFileRoute("/directory/$slug")({
  loader: async ({ params }) => {
    const page = await getBrandPage({ data: { slug: params.slug } });
    if (page.redirect) throw redirect({ to: "/directory/$slug", params: { slug: page.redirect }, statusCode: 301 });
    if (!page.brand) throw notFound();
    return page;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData?.brand) return { meta: [{ title: "Not in the Directory right now — Gravity Pants" }, { name: "robots", content: "noindex" }] };
    const b = loaderData.brand;
    const image = b.logo_url?.startsWith("https://") ? b.logo_url : loaderData.reels.find((r) => r.poster)?.poster ?? undefined;
    const head = siteHead({
      path: `/directory/${params.slug}`,
      title: `${b.name} video ads — Gravity Pants Directory`,
      description: b.description || `Reels and video ads by ${b.name}, made with Gravity Pants.`,
      ...(image ? { image } : {}),
    });
    head.meta = [...(head.meta ?? []), { name: "robots", content: "noindex" }]; // Directory isn't on the marketing site yet
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", name: b.name, url: b.website_url ?? `${ORIGIN}/directory/${b.slug}`, ...(b.description ? { description: b.description } : {}) },
        ...loaderData.reels.map((r) => ({
          "@type": "VideoObject",
          name: `${b.name} — ${r.template_name ?? "reel"}`,
          description: [b.description, ...r.moods, ...r.tags].filter(Boolean).join(", ") || `${b.name} reel`,
          ...(r.poster ? { thumbnailUrl: r.poster } : {}),
          duration: `PT${Math.max(1, Math.round(r.seconds))}S`,
          uploadDate: new Date().toISOString().slice(0, 10),
        })),
      ],
    };
    return { ...head, scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }] };
  },
  notFoundComponent: () => (
    <SiteShell>
      <main className="py-24 text-center font-ap">
        <h1 className="text-[28px] font-semibold">This brand isn't in the Directory right now</h1>
        <Link to="/directory" className="mt-4 inline-block text-ap-blue">Search the Directory</Link>
      </main>
    </SiteShell>
  ),
  errorComponent: () => <SiteShell><p className="py-20 text-center">This page couldn't load. Try again.</p></SiteShell>,
  component: BrandPage,
});

function BrandPage() {
  const { brand, reels, more } = Route.useLoaderData();
  const [open, setOpen] = useState<DirectoryCard | null>(null);
  if (!brand) return null;
  const sizes = new Set(reels.flatMap((r) => r.formats));
  const initials = brand.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <SiteShell>
      <main className="font-ap text-ap-ink">
        <div className="mx-auto max-w-[1440px] px-6 pt-10 pb-16 sm:px-8 lg:px-10">
          <Link to="/directory" className="inline-flex text-[15px] text-ap-blue">← Directory</Link>
          <header className="mt-10 mb-12 border-b border-ap-hairline pb-10 sm:mt-12 sm:pb-11">
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:gap-x-6">
              <div className="flex items-center justify-end gap-1 self-start sm:col-start-2 sm:row-start-1 lg:col-start-3">
                <BrandActions brandId={brand.id} name={brand.name} />
              </div>
              {brand.logo_url?.startsWith("https://")
                ? <img src={brand.logo_url} alt={`${brand.name} logo`} className="size-24 rounded-lg border border-ap-hairline bg-ap-card object-contain sm:row-start-1 sm:mt-10" />
                : <div className="grid size-24 shrink-0 place-items-center rounded-lg border border-ap-hairline bg-ap-card text-[30px] font-semibold text-ap-ink sm:row-start-1 sm:mt-10">{initials}</div>}
              <div className="min-w-0 sm:col-start-2 sm:row-start-1">
                <p className="text-[15px] font-semibold text-ap-badge">{brand.category}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-[clamp(36px,4vw,52px)] leading-[1.05] font-semibold tracking-[-0.035em]">{brand.name}</h1>
                </div>
                {brand.description && <p className="mt-5 max-w-[760px] text-[18px] leading-[1.5] text-ap-body">{brand.description}</p>}
                <div className="mt-5 flex flex-wrap gap-2 text-[13px] nums">
                  {[`${reels.length} public ${reels.length === 1 ? "reel" : "reels"}`, `${sizes.size} ${sizes.size === 1 ? "size" : "sizes"}`].map((c) => <span key={c} className="rounded-lg bg-ap-panel px-3 py-1.5">{c}</span>)}
                </div>
              </div>
              {brand.website_url && (
                <a href={brand.website_url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ap-blue px-6 text-[16px] font-semibold text-ap-card sm:col-start-2 sm:w-fit lg:col-start-3 lg:row-start-1 lg:mt-12 lg:min-w-[188px] lg:self-start">
                  Visit {brand.name} <ArrowUpRight className="size-4" strokeWidth={1.7} />
                </a>
              )}
            </div>
          </header>
          <h2 className="mb-5 text-[24px] font-semibold tracking-[-0.02em]">Reels</h2>
          <DirectoryGrid cards={reels} onOpen={setOpen} />
        </div>
        {more.length > 0 && (
          <section className="home-examples !min-h-0 !gap-6 py-12">
            <h2 className="mx-auto w-full max-w-[1280px] px-6 text-[24px] font-semibold tracking-[-0.02em]">More brands like {brand.name}</h2>
            <ReelCarousel
              label={`More brands like ${brand.name}`}
              items={more.map((m) => ({
                key: m.slug,
                media: (hidden) => (
                  <Link to="/directory/$slug" params={{ slug: m.slug }} tabIndex={hidden ? -1 : undefined} className="grid aspect-[9/16] place-items-center overflow-hidden rounded-[14px] bg-ap-panel">
                    {m.poster ? <img src={m.poster} alt={`${m.name} reel`} className="max-h-full max-w-full object-contain" /> : null}
                  </Link>
                ),
                title: m.name,
                detail: brand.category,
              }))}
            />
          </section>
        )}
      </main>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
    </SiteShell>
  );
}
