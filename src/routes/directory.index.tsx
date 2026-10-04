import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { DirectoryGrid } from "@/components/directory/DirectoryGrid";
import { searchDirectory } from "@/lib/directory/directory.functions";
import { MOODS, type DirectoryCard } from "@/lib/directory/directory";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/directory/")({
  validateSearch: z.object({ q: z.string().optional() }),
  loaderDeps: ({ search }) => ({ q: search.q ?? "" }),
  loader: ({ deps }) => searchDirectory({ data: { q: deps.q, size: null } }).catch(() => [] as DirectoryCard[]),
  head: () =>
    siteHead({
      path: "/directory",
      title: "Gravity Pants Directory — Video ad ideas by mood and brand",
      description: "Search real video ads and Reels made with Gravity Pants by mood, product or brand, and start your own from the same template.",
    }),
  errorComponent: () => <SiteShell><p className="py-20 text-center">The Directory couldn't load. Try again.</p></SiteShell>,
  component: DirectoryPage,
});

function DirectoryPage() {
  const cards = Route.useLoaderData();
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/directory/" });
  const [value, setValue] = useState(q);
  const featured = cards.filter((c) => c.featured);
  const go = (v: string) => void navigate({ search: { q: v || undefined } });
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-6 pb-20 font-ap text-ap-ink">
        <section className="pt-20 pb-10 text-center">
          <p className="mb-3.5 text-[15px] font-semibold text-ap-badge">Gravity Pants Directory</p>
          <h1 className="mb-7 text-[clamp(30px,5vw,56px)] leading-[1.08] font-semibold tracking-[-0.035em]">Find a reel that feels right.</h1>
          <form onSubmit={(e) => { e.preventDefault(); go(value.trim()); }} className="mx-auto flex max-w-[620px] items-center gap-2 rounded-[14px] border border-ap-hairline bg-ap-card px-4 focus-within:border-ap-blue focus-within:shadow-ap-focus">
            <Search className="size-5 text-ap-muted" strokeWidth={1.7} />
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Try: cozy knitwear, square, TikTok" aria-label="Search the Directory" className="h-12 flex-1 bg-transparent text-[16px] outline-hidden" />
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {MOODS.map((m) => (
              <button key={m} type="button" onClick={() => { setValue(m); go(m); }} className="rounded-lg border border-ap-hairline bg-ap-card px-3 py-1.5 text-[14px] hover:border-ap-blue hover:text-ap-blue">{m}</button>
            ))}
          </div>
        </section>
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-[22px] font-semibold">Featured</h2>
            <DirectoryGrid cards={featured.slice(0, 8)} />
          </section>
        )}
        <section>
          <h2 className="mb-4 text-[22px] font-semibold">{q ? `Results for “${q}”` : "Latest reels"}</h2>
          <DirectoryGrid cards={cards} />
        </section>
      </main>
    </SiteShell>
  );
}
