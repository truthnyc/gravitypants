import { createFileRoute, notFound, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { DirectoryGrid, ReelDetail } from "@/components/directory/DirectoryGrid";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { getBrandPage } from "@/lib/directory/directory.functions";
import type { DirectoryCard } from "@/lib/directory/directory";
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
        <div className="mx-auto max-w-[1280px] px-6 pt-12 pb-16">
          <Link to="/directory" className="text-[14px] text-ap-blue">← Directory</Link>
          <header className="mt-6 mb-12 flex flex-col gap-6 sm:flex-row sm:items-start">
            {brand.logo_url?.startsWith("https://")
              ? <img src={brand.logo_url} alt={`${brand.name} logo`} className="size-24 rounded-[16px] object-contain" />
              : <div className="grid size-24 shrink-0 place-items-center rounded-[16px] bg-ap-blue text-[30px] font-semibold text-ap-card">{initials}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ap-badge">{brand.category}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-[clamp(30px,4vw,48px)] leading-tight font-semibold tracking-[-0.03em]">{brand.name}</h1>
                {brand.featured && <span className="rounded-lg bg-ap-soft-blue px-2.5 py-1 text-[13px] font-semibold tracking-normal text-ap-blue"><span className="text-[#d4a017]">★</span> Featured brand</span>}
              </div>
              {brand.description && <p className="mt-2 max-w-[640px] text-[17px] leading-normal text-ap-body">{brand.description}</p>}
              <div className="mt-4 flex flex-wrap gap-1.5 text-[13px] nums">
                {[`${reels.length} public ${reels.length === 1 ? "reel" : "reels"}`, `${sizes.size} ${sizes.size === 1 ? "size" : "sizes"}`, `gravitypants.com/directory/${brand.slug}`].map((c) => <span key={c} className="rounded-lg bg-ap-panel px-2.5 py-1">{c}</span>)}
              </div>
              {brand.website_url && (
                <a href={brand.website_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-lg bg-ap-blue px-5 text-[15px] font-semibold text-ap-card">
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
