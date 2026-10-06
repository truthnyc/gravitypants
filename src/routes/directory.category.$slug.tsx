import { createFileRoute, notFound, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { DirectoryGrid, ReelDetail } from "@/components/directory/DirectoryGrid";
import { listPublicBrands, searchDirectoryLegacy } from "@/lib/directory/directory.functions";
import { CATEGORIES, CATEGORY_COVERS, categoryFromSlug, categorySlug, type DirectoryCard } from "@/lib/directory/directory";
import { listSiteReels } from "@/lib/site/reels.functions";
import type { SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { SiteReelHeart } from "@/components/site/SiteReelHeart";
import { SiteReelModal } from "@/components/site/SiteReelModal";

const POSTER =
  "absolute top-1/2 left-1/2 h-[72%] w-auto max-w-[72%] object-contain -translate-x-1/2 -translate-y-1/2 rounded-[6px] shadow-[0_0_0_1px_var(--ap-inner),0_18px_34px_-16px_rgba(29,29,31,.28)]";

export const Route = createFileRoute("/directory/category/$slug")({
  // Category pages now open the Directory with that category already filtered.
  beforeLoad: ({ params }) => {
    if (categoryFromSlug(params.slug)) throw redirect({ to: "/directory", search: { category: params.slug }, statusCode: 301 });
  },
  loader: async ({ params }) => {
    const category = categoryFromSlug(params.slug);
    if (!category) throw notFound();
    const [cards, reels, brands] = await Promise.all([
      searchDirectoryLegacy({ data: { q: "", size: null } }).catch(() => [] as DirectoryCard[]),
      listSiteReels().catch(() => [] as SiteReel[]),
      listPublicBrands().catch(() => []),
    ]);
    const inCat = brands.filter((b) => b.category === category);
    const slugs = new Set(inCat.map((b) => b.slug));
    return {
      category,
      brands: inCat,
      cards: cards.filter((c) => c.category === category),
      reels: reels.filter((r) => r.brandSlug && slugs.has(r.brandSlug)),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Category not found — Gravity Pants" }, { name: "robots", content: "noindex" }] };
    const c = loaderData.category;
    const head = siteHead({
      path: `/directory/category/${categorySlug(c)}`,
      title: `${c} Video Ads – Gravity Pants`,
      description: `Video ads and Reels from ${c.toLowerCase()} brands (${CATEGORY_COVERS[c].toLowerCase()}), made with Gravity Pants. Start your own from the same template.`,
    });
    head.meta = [...(head.meta ?? []).filter((m: any) => m?.name !== "robots"), { name: "robots", content: "noindex, follow" }]; // eslint-disable-line @typescript-eslint/no-explicit-any
    return head;
  },
  notFoundComponent: () => (
    <SiteShell>
      <main className="py-24 text-center font-ap">
        <h1 className="text-[28px] font-semibold">That category doesn't exist</h1>
        <Link to="/directory" className="mt-4 inline-block text-ap-blue">Browse the Directory</Link>
      </main>
    </SiteShell>
  ),
  errorComponent: () => (
    <SiteShell>
      <p className="py-20 text-center">This category couldn't load. Try again.</p>
    </SiteShell>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category, brands, cards, reels } = Route.useLoaderData();
  const [open, setOpen] = useState<DirectoryCard | null>(null);
  const [openSite, setOpenSite] = useState<SiteReel | null>(null);
  const empty = cards.length === 0 && reels.length === 0;
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-6 py-16 font-ap text-ap-ink">
        <Link to="/directory" className="text-[14px] text-ap-blue">Directory</Link>
        <h1 className="mt-2 text-[clamp(30px,4vw,44px)] font-semibold tracking-[-0.03em]">{category}</h1>
        <p className="mt-2 text-[17px] text-ap-muted">{CATEGORY_COVERS[category]}</p>
        <p className="mt-1 text-[14px] text-ap-muted nums">
          {brands.length} {brands.length === 1 ? "brand" : "brands"} · {cards.length + reels.length} {cards.length + reels.length === 1 ? "reel" : "reels"}
        </p>

        {brands.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2">
            {brands.map((b) => (
              <li key={b.id}>
                <Link to="/directory" search={{ brand: b.slug }} className="inline-block rounded-lg bg-ap-panel px-3.5 py-2 text-[14px] font-medium hover:bg-ap-media">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-10">
          {cards.length > 0 && <DirectoryGrid cards={cards} onOpen={setOpen} />}
          {reels.length > 0 && (
            <ul className={`grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] ${cards.length ? "mt-5" : ""}`}>
              {reels.map((r) => (
                <li key={r.id} className="relative">
                  <button type="button" onClick={() => setOpenSite(r)} aria-label={`Open ${r.title}`} className="relative block aspect-square w-full overflow-hidden rounded-[8px] bg-ap-panel">
                    {r.poster && <img src={r.poster} alt="" loading="lazy" className={POSTER} />}
                  </button>
                  <SiteReelHeart reelId={r.id} name={r.title} />
                  <p className="mt-2.5 truncate text-[14px] font-semibold">{r.title}</p>
                  <p className="truncate text-[12px] text-ap-muted nums">{r.brand} · {r.seconds} sec</p>
                </li>
              ))}
            </ul>
          )}
          {empty && <p className="text-ap-muted">No reels in this category yet. Check back soon.</p>}
        </section>

        <section className="mt-16">
          <h2 className="mb-4 text-[20px] font-semibold">Other categories</h2>
          <CategoryChips current={category} />
        </section>
      </main>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
      <SiteReelModal reel={openSite} onClose={() => setOpenSite(null)} />
    </SiteShell>
  );
}

function CategoryChips({ current }: { current?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {CATEGORIES.filter((c) => c !== current).map((c) => (
        <li key={c}>
          <Link to="/directory/category/$slug" params={{ slug: categorySlug(c) }} className="inline-block rounded-lg bg-ap-panel px-3.5 py-2 text-[14px] hover:bg-ap-media">
            {c}
          </Link>
        </li>
      ))}
    </ul>
  );
}
