import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { DirectoryGrid, ReelDetail } from "@/components/directory/DirectoryGrid";
import { getPublicFavorites } from "@/lib/directory/favorites.functions";
import type { DirectoryCard } from "@/lib/directory/directory";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/favorites/$slug")({
  loader: async ({ params }) => {
    const page = await getPublicFavorites({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData, params }) => {
    const title = loaderData?.title ?? "Favorites";
    const head = siteHead({ path: `/favorites/${params.slug}`, title: `${title} — Gravity Pants Directory`, description: `Favorite reels and brands from the Gravity Pants Directory, collected in ${title}.` });
    head.meta = [...(head.meta ?? []), { name: "robots", content: "noindex" }];
    return head;
  },
  notFoundComponent: () => (
    <SiteShell>
      <main className="py-24 text-center font-ap">
        <h1 className="text-[28px] font-semibold">This favorites page isn't shared right now</h1>
        <Link to="/directory" className="mt-4 inline-block text-ap-blue">Search the Directory</Link>
      </main>
    </SiteShell>
  ),
  errorComponent: () => <SiteShell><p className="py-20 text-center">This page couldn't load. Try again.</p></SiteShell>,
  component: FavoritesPublic,
});

function FavoritesPublic() {
  const { title, reels, brands } = Route.useLoaderData();
  const [open, setOpen] = useState<DirectoryCard | null>(null);
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-6 pt-12 pb-16 font-ap text-ap-ink">
        <Link to="/directory" className="text-[14px] text-ap-blue">← Directory</Link>
        <h1 className="mt-6 text-[clamp(30px,4vw,48px)] leading-tight font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-[15px] text-ap-body nums">{reels.length} {reels.length === 1 ? "reel" : "reels"} · {brands.length} {brands.length === 1 ? "brand" : "brands"}</p>
        {reels.length > 0 && <><h2 className="mt-10 mb-5 text-[24px] font-semibold">Reels</h2><DirectoryGrid cards={reels} onOpen={setOpen} /></>}
        {brands.length > 0 && (
          <>
            <h2 className="mt-12 mb-5 text-[24px] font-semibold">Brands</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => (
                <li key={b.id}><Link to="/directory/$slug" params={{ slug: b.slug }} className="block rounded-[4px] bg-ap-panel p-3 hover:text-ap-blue">
                  <span className="flex size-9 items-center justify-center rounded-[4px] bg-ap-hairline">
                    {b.logo
                      ? <img src={b.logo} alt="" className="max-h-full max-w-full object-contain" />
                      : <span className="text-[16px] font-semibold text-ap-muted">{b.name.charAt(0).toUpperCase()}</span>}
                  </span>
                  <p className="mt-2.5 text-[12px] text-ap-muted">{b.category}</p>
                  <p className="mt-0.5 truncate text-[14px] font-semibold">{b.name}</p>
                </Link></li>
              ))}
            </ul>
          </>
        )}
        {!reels.length && !brands.length && <p className="mt-10 text-ap-body">Nothing saved here yet.</p>}
      </main>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
    </SiteShell>
  );
}
