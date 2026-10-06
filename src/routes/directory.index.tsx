import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FilterBar, type FilterValue } from "@/components/directory/FilterBar";
import { DirectoryReelHeart } from "@/components/directory/LikeSave";
import { X } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { ReelVideo } from "@/components/site/ReelVideo";
import { ReelDetail } from "@/components/directory/DirectoryGrid";
import { listPublicBrands, searchDirectory, searchDirectoryLegacy, type FacetedReel } from "@/lib/directory/directory.functions";
import { type DirectoryCard } from "@/lib/directory/directory";
import { listSiteReels } from "@/lib/site/reels.functions";
import { FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { SiteReelHeart } from "@/components/site/SiteReelHeart";
import { SiteReelModal } from "@/components/site/SiteReelModal";
import { useMoodCatalog } from "@/lib/directory/moods";

const POSTER =
  "absolute top-1/2 left-1/2 h-[72%] w-auto max-w-[72%] object-contain -translate-x-1/2 -translate-y-1/2 rounded-[6px] shadow-[0_0_0_1px_var(--ap-inner),0_18px_34px_-16px_rgba(29,29,31,.28)]";

const ROTATING = ["soothing", "energizing", "hopeful", "inspiring", "cozy", "luxurious", "playful"];
export const Route = createFileRoute("/directory/")({
  validateSearch: z.object({
    q: z.string().optional(), moods: z.string().optional(), categories: z.string().optional(), brands: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({ q: (search.q ?? "").slice(0, 200) }),
  loader: async ({ deps }) => {
    // Lookups for the carousel, brand panel and reel pop-ups; the grid itself is filtered and paged on the server.
    const [cards, reels, brands] = await Promise.all([
      searchDirectoryLegacy({ data: { q: "", size: null } }).catch(() => [] as DirectoryCard[]),
      listSiteReels().catch(() => [] as SiteReel[]),
      listPublicBrands().catch(() => []),
    ]);
    return { q: deps.q, cards, reels, brands };
  },
  head: ({ loaderData }) => {
    const base = siteHead({
      path: "/directory",
      title: loaderData?.q
        ? `“${loaderData.q}” video ads — Gravity Pants Directory`
        : "Gravity Pants Directory — Video ad ideas by mood and brand",
      description:
        "Search real video ads and Reels made with Gravity Pants by mood, product or brand, and start your own from the same template.",
    });
    // The Directory isn't part of the marketing site yet — keep all pages out of search results.
    return {
      ...base,
      meta: [
        ...(base.meta ?? []).filter((m: any) => m?.name !== "robots"),
        { name: "robots", content: "noindex, follow" },
      ],
    }; // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  errorComponent: () => (
    <SiteShell>
      <p className="py-20 text-center">The Directory couldn't load. Try again.</p>
    </SiteShell>
  ),
  component: DirectoryPage,
});

function useWeekdayMood() {
  const [i, setI] = useState(0);
  const [day, setDay] = useState("today");
  useEffect(() => {
    setDay(new Date().toLocaleDateString("en-US", { weekday: "long" }));
    const t = setInterval(() => setI((x) => (x + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, []);
  return { day, mood: ROTATING[i]! };
}

const list = (v?: string) => (v ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 60) : []);

function DirectoryPage() {
  const { q, cards: allCards, reels, brands } = Route.useLoaderData();
  const search = Route.useSearch();
  const filters: FilterValue = { moods: list(search.moods), categories: list(search.categories), brands: list(search.brands) };
  const { families } = useMoodCatalog();
  const navigate = useNavigate({ from: "/directory/" });
  const [value, setValue] = useState(q);
  const [open, setOpen] = useState<DirectoryCard | null>(null);
  const [openSite, setOpenSite] = useState<SiteReel | null>(null);
  const { day, mood } = useWeekdayMood();
  useEffect(() => setValue(q), [q]);
  const go = (v: string) => void navigate({ search: (prev) => ({ ...prev, q: v.trim() || undefined }) });
  const setFilters = (f: FilterValue) => void navigate({
    replace: true, resetScroll: false,
    search: (prev) => ({ ...prev, moods: f.moods.join(",") || undefined, categories: f.categories.join(",") || undefined, brands: f.brands.join(",") || undefined }),
  });
  const searchFn = useServerFn(searchDirectory);
  const results = useInfiniteQuery({
    queryKey: ["directory-search", q, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => searchFn({ data: { q, ...filters, page: pageParam } }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const first = results.data?.pages[0];
  const found = results.data?.pages.flatMap((p) => p.reels) ?? [];
  const total = first?.total ?? 0;
  const facets = first?.facets ?? { moods: {}, categories: {}, brands: {} };
  const filtered = !!q || filters.moods.length + filters.categories.length + filters.brands.length > 0;
  const openReel = (r: FacetedReel) => {
    if (r.kind === "site") setOpenSite(reels.find((x) => x.id === r.id) ?? null);
    else setOpen(allCards.find((c) => c.reel_id === r.id) ?? null);
  };

  return (
    <SiteShell>
      <main className="font-ap text-ap-ink">
        <section className="mx-auto max-w-[900px] px-6 pt-20 pb-10 text-center">
          <h1 className="mb-8 text-[clamp(30px,5vw,56px)] leading-[1.08] font-semibold tracking-[-0.035em] text-[#a1a1a6]">
            <b className="font-semibold text-ap-ink">
              <span className="text-[#a1a1a6]">Happy </span>
              <span className="text-ap-ink">{day}.</span>
              <span className="text-[#a1a1a6]"> Show me something:</span>
              <br />{" "}
            </b>
            <span className="text-ap-blue" aria-live="polite">
              <span className="font-light text-[#c7c7cc]">[ </span>
              <span key={mood} className="inline-block animate-[dir-mood_.3s_ease]">
                {mood}
              </span>
              <span className="font-light text-[#c7c7cc]"> ]</span>
            </span>
          </h1>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go(value);
            }}
            className="mx-auto flex h-[60px] max-w-[680px] items-center gap-2.5 rounded-[12px] border border-transparent bg-ap-panel pr-2 pl-5 transition-[background,border-color,box-shadow] focus-within:border-ap-hairline focus-within:bg-ap-card focus-within:shadow-[0_10px_30px_rgba(20,30,50,.10)]"
          >
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Try: cozy knitwear, square, Purl Soho"
              aria-label="Search the Directory"
              className="h-full min-w-0 flex-1 bg-transparent text-[19px] outline-hidden placeholder:text-[#8e8e93]"
            />
            {value && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setValue("");
                  go("");
                }}
                className="grid size-8 place-items-center text-ap-muted"
              >
                <X className="size-4" strokeWidth={1.7} />
              </button>
            )}
            <button
              type="submit"
              className="h-11 rounded-lg bg-ap-blue px-5 text-[16px] text-ap-card hover:bg-ap-blue-hover"
            >
              Search
            </button>
          </form>
          <FilterBar value={filters} onChange={setFilters} facets={facets} total={total} families={families} brands={brands} />
        </section>

        {!filtered && reels.length > 0 && (
          <section className="home-examples dir-carousel !min-h-0 !gap-8 !py-14">
            <ReelCarousel
              label="Reels made with Gravity Pants"
              items={reels.map((r) => ({
                key: r.id,
                media: () => (
                  <div className={`home-example-video home-example-video-${r.format}`}>
                    <ReelVideo video={r.video} videoWebm={r.videoWebm ?? undefined} poster={r.poster ?? undefined} label={`${r.title} video ad`} />
                  </div>
                ),
                title: r.title,
                detail: `${r.photos} photos · ${r.seconds} sec · ${FORMAT_LABEL[r.format]} · ${r.brand}`,
                visit: r.href ? { href: r.href, label: `Visit ${r.brand}` } : undefined,
              }))}
            />
          </section>
        )}
        <section className="mx-auto max-w-[1280px] px-6 py-14" aria-busy={results.isFetching}>
          <h2 className="mb-5 text-[24px] font-semibold tracking-[-0.02em]">
            {filtered ? <span className="nums" role="status">{total} {total === 1 ? "reel" : "reels"}</span> : "Browse the directory"}
          </h2>
          {found.length > 0 && (
            <ul className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
              {found.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="relative">
                  <button type="button" onClick={() => openReel(r)} aria-label={`Open ${r.title}`}
                    className="relative block aspect-square w-full overflow-hidden rounded-[8px] bg-ap-panel">
                    {r.poster && <img src={r.poster} alt="" loading="lazy" className={POSTER} />}
                  </button>
                  {r.kind === "site" ? <SiteReelHeart reelId={r.id} name={r.title} /> : <DirectoryReelHeart reelId={r.id} name={`${r.brand_name} reel`} />}
                  <p className="mt-2.5 truncate text-[14px] font-semibold">{r.title}</p>
                  <p className="truncate text-[12px] text-ap-muted">{r.brand_name} · {r.category}</p>
                </li>
              ))}
            </ul>
          )}
          {!results.isPending && found.length === 0 && (
            <p className="text-ap-muted" role="status">{filtered ? "No reels match these filters yet. Try removing one." : "The first reels are on their way."}</p>
          )}
          {results.hasNextPage && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => void results.fetchNextPage()} disabled={results.isFetchingNextPage}
                className="h-11 rounded-lg bg-ap-panel px-5 text-[15px] font-medium hover:bg-ap-media disabled:opacity-60">
                {results.isFetchingNextPage ? "Loading…" : "Show more reels"}
              </button>
            </div>
          )}
        </section>
      </main>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
      <SiteReelModal reel={openSite} onClose={() => setOpenSite(null)} />
    </SiteShell>
  );
}
