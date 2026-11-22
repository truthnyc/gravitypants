import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { aimanteHead } from "@/lib/site/brand-site";
import { AimanteShell } from "@/components/site/AimanteShell";
import { listPublicBrands } from "@/lib/directory/directory.functions";
import { CATEGORIES, CATEGORY_COVERS, categorySlug } from "@/lib/directory/directory";

export const Route = createFileRoute("/aimante/brands")({
  loader: async () => {
    const brands = await listPublicBrands().catch(() => []);
    return { brands: brands.map((b) => ({ name: b.name, slug: b.slug, category: b.category, logo: b.logo_url })) };
  },
  head: () => aimanteHead({ path: "/brands", title: "All brands and categories — Aimanté", description: "Browse every independent brand on Aimanté from A to Z, or explore by category: fashion, home, food, crafts and more." }),
  component: BrandsPage,
  errorComponent: () => <AimanteShell><p className="p-10 text-ap-muted">We couldn't load the brands. Please try again.</p></AimanteShell>,
  notFoundComponent: () => <AimanteShell><p className="p-10 text-ap-muted">Page not found.</p></AimanteShell>,
});

const letterOf = (n: string) => { const c = n.normalize("NFKD").charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; };

function BrandsPage() {
  const { brands } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const used = new Set(brands.map((b) => b.category));
  const cats = CATEGORIES.filter((c) => used.has(c));
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = brands.filter((b) => !t || b.name.toLowerCase().includes(t) || b.category.toLowerCase().includes(t));
    const m = new Map<string, typeof list>();
    for (const b of list) { const l = letterOf(b.name); m.set(l, [...(m.get(l) ?? []), b]); }
    return [...m.entries()].sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
  }, [brands, q]);
  return (
    <AimanteShell>
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-10 md:py-14">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-ap-ink md:text-[44px]">Brands and categories</h1>
        <p className="mt-2 max-w-[620px] text-[17px] text-ap-muted">Every independent brand on Aimanté, by category and from A to Z.</p>

        <section aria-labelledby="cats" className="mt-10">
          <h2 id="cats" className="text-[22px] font-semibold text-ap-ink">Categories</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <li key={c}>
                <Link to="/directory" search={{ category: categorySlug(c) }} className="block h-full rounded-[4px] bg-ap-panel p-4 hover:bg-ap-hairline">
                  <span className="block text-[16px] font-semibold text-ap-ink">{c}</span>
                  <span className="mt-1 block text-[14px] text-ap-muted">{CATEGORY_COVERS[c]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="az" className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="az" className="text-[22px] font-semibold text-ap-ink">Brands A–Z</h2>
            <label className="relative w-full sm:w-[320px]">
              <span className="sr-only">Search brands</span>
              <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands" className="h-10 w-full rounded-[4px] border border-aimante-divider bg-ap-card pl-9 pr-3 text-[15px] text-ap-ink outline-none focus:border-ap-blue" />
            </label>
          </div>
          <nav aria-label="Jump to letter" className="mt-4 flex flex-wrap gap-1">
            {groups.map(([l]) => <a key={l} href={`#letter-${l}`} className="inline-flex size-8 items-center justify-center rounded-lg text-[14px] text-ap-ink hover:bg-ap-panel">{l}</a>)}
          </nav>
          {groups.length === 0 && <p className="mt-6 text-ap-muted">No brands match that search.</p>}
          {groups.map(([l, list]) => (
            <div key={l} id={`letter-${l}`} className="mt-8 scroll-mt-24">
              <h3 className="border-b border-aimante-divider pb-2 text-[18px] font-semibold text-ap-ink">{l}</h3>
              <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((b) => (
                  <li key={b.slug}>
                    <Link to="/directory/$slug" params={{ slug: b.slug }} className="flex items-center gap-3 rounded-[4px] p-2 hover:bg-ap-panel">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[4px] bg-ap-panel">
                        {b.logo ? <img src={b.logo} alt="" loading="lazy" className="max-h-full max-w-full object-contain p-1" /> : <span className="text-[14px] font-semibold text-ap-muted">{b.name.charAt(0)}</span>}
                      </span>
                      <span className="min-w-0"><span className="block truncate text-[15px] font-medium text-ap-ink">{b.name}</span><span className="block truncate text-[13px] text-ap-muted">{b.category}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </AimanteShell>
  );
}
