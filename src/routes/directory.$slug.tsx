import { createFileRoute, notFound, redirect, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { DirectoryGrid } from "@/components/directory/DirectoryGrid";
import { getBrandPage } from "@/lib/directory/directory.functions";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/directory/$slug")({
  loader: async ({ params }) => {
    const page = await getBrandPage({ data: { slug: params.slug } });
    if (page.redirect) throw redirect({ to: "/directory/$slug", params: { slug: page.redirect }, statusCode: 301 });
    if (!page.brand) throw notFound();
    return page;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData?.brand) return { meta: [{ title: "Brand not found — Gravity Pants Directory" }, { name: "robots", content: "noindex" }] };
    const b = loaderData.brand;
    return siteHead({
      path: `/directory/${params.slug}`,
      title: `${b.name} video ads — Gravity Pants Directory`,
      description: b.description || `Reels and video ads by ${b.name}, made with Gravity Pants.`,
    });
  },
  notFoundComponent: () => (
    <SiteShell>
      <main className="py-24 text-center font-ap">
        <h1 className="text-[28px] font-semibold">This brand page isn't here</h1>
        <Link to="/directory" className="mt-4 inline-block text-ap-blue">Search the Directory</Link>
      </main>
    </SiteShell>
  ),
  errorComponent: () => <SiteShell><p className="py-20 text-center">This page couldn't load. Try again.</p></SiteShell>,
  component: BrandPage,
});

function BrandPage() {
  const { brand, reels } = Route.useLoaderData();
  if (!brand) return null;
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-6 pt-16 pb-20 font-ap text-ap-ink">
        <Link to="/directory" className="text-[14px] text-ap-blue">‹ Directory</Link>
        <header className="mt-4 mb-10">
          <p className="text-[15px] font-semibold text-ap-badge">{brand.category}{brand.featured ? " · Featured" : ""}</p>
          <h1 className="mt-1 text-[clamp(30px,4vw,48px)] font-semibold tracking-[-0.03em]">{brand.name}</h1>
          {brand.description && <p className="mt-2 max-w-[640px] text-[17px] text-ap-body">{brand.description}</p>}
          {brand.website_url && (
            <a href={brand.website_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-ap-blue">
              Visit {brand.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ArrowUpRight className="size-4" strokeWidth={1.7} />
            </a>
          )}
        </header>
        <DirectoryGrid cards={reels} />
      </main>
    </SiteShell>
  );
}
