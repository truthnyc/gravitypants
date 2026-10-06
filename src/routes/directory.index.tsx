import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FilterBar, type FilterValue } from "@/components/directory/FilterBar";
import { DirectoryReelHeart } from "@/components/directory/LikeSave";
import { X } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { ReelVideo } from "@/components/site/ReelVideo";
import { ReelDetail } from "@/components/directory/DirectoryGrid";
import { listPublicBrands, searchDirectory, searchDirectoryLegacy, type FacetedReel } from "@/lib/directory/directory.functions";
import { CATEGORIES, categorySlug, type DirectoryCard } from "@/lib/directory/directory";
import { MOOD_FAMILY_COLORS, type MoodFamily } from "@/lib/directory/mood-admin";
import { cn } from "@/lib/utils";
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
    q: z.string().optional(), mood: z.string().optional(), category: z.string().optional(), brand: z.string().optional(),
    page: z.union([z.number(), z.string()]).optional(),
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

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setR(m.matches);
    f(); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

/** Rotates through moods, unless the visitor picked some (then the newest pick stays) or prefers less motion. */
function useWeekdayMood(picked: string | undefined) {
  const [i, setI] = useState(0);
  const [day, setDay] = useState("today");
  const reduced = useReducedMotion();
  useEffect(() => setDay(new Date().toLocaleDateString("en-US", { weekday: "long" })), []);
  useEffect(() => {
    if (picked || reduced) return;
    const t = setInterval(() => setI((x) => (x + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, [picked, reduced]);
  return { day, mood: picked ?? ROTATING[i]! };
}

const list = (v?: string) => (v ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 60) : []);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
type Tag = { key: keyof FilterValue; value: string; label: string };

function DirectoryPage() {
  const { cards: allCards, reels, brands } = Route.useLoaderData();
  const search = Route.useSearch();
  const q = (search.q ?? "").slice(0, 200);
  const page = Math.min(Math.max(1, Math.floor(Number(search.page) || 1)), 20);
  const filters: FilterValue = { moods: list(search.mood), categories: list(search.category), brands: list(search.brand) };
  const fKey = JSON.stringify(filters);
  const { families } = useMoodCatalog();
  const navigate = useNavigate({ from: "/directory/" });
  const [value, setValue] = useState(q);
  const [open, setOpen] = useState<DirectoryCard | null>(null);
  const [openSite, setOpenSite] = useState<SiteReel | null>(null);
  const { day, mood } = useWeekdayMood(filters.moods.at(-1));
  const input = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => setValue(q), [q]);
  const go = (v: string) => void navigate({ replace: true, resetScroll: false, search: (prev) => ({ ...prev, q: v.trim() || undefined, page: undefined }) });
  // Live search, 250ms after typing stops.
  useEffect(() => {
    if (value.trim() === q) return;
    const t = setTimeout(() => go(value), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  // "/" jumps to the search field.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault(); input.current?.focus();
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, []);
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e!.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const setFilters = (f: FilterValue) => void navigate({
    replace: true, resetScroll: false,
    search: (prev) => ({ ...prev, mood: f.moods.join(",") || undefined, category: f.categories.join(",") || undefined, brand: f.brands.join(",") || undefined, page: undefined }),
  });
  const searchFn = useServerFn(searchDirectory);
  const results = useQuery({
    queryKey: ["directory-search", q, fKey, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const pages = await Promise.all(Array.from({ length: page }, (_, i) => searchFn({ data: { q, ...filters, page: i + 1 } })));
      return { ...pages[0]!, reels: pages.flatMap((p) => p.reels), hasMore: pages.at(-1)!.hasMore };
    },
  });
  const everything = useQuery({ queryKey: ["directory-search-all"], staleTime: 60_000, queryFn: () => searchFn({ data: { pageSize: 1 } }) });
  const found = results.data?.reels ?? [];
  const total = results.data?.total ?? 0;
  const allTotal = everything.data?.total ?? total;
  const facets = results.data?.facets ?? { moods: {}, categories: {}, brands: {} };
  const filtered = !!q || filters.moods.length + filters.categories.length + filters.brands.length > 0;

  const famOf = new Map(families.flatMap((f) => f.moods.map((m) => [m, f.family] as const)));
  const tags: Tag[] = [
    ...filters.moods.map((v) => ({ key: "moods" as const, value: v, label: `Mood · ${cap(v)}` })),
    ...filters.categories.map((v) => ({ key: "categories" as const, value: v, label: `Category · ${CATEGORIES.find((c) => categorySlug(c) === v) ?? v}` })),
    ...filters.brands.map((v) => ({ key: "brands" as const, value: v, label: `Brand · ${brands.find((b) => b.slug === v)?.name ?? v}` })),
  ];
  const without = (t: Tag): FilterValue => ({ ...filters, [t.key]: filters[t.key].filter((x) => x !== t.value) });

  // Empty state: which single removal brings back the most reels.
  const empty = !!results.data && !results.isPlaceholderData && total === 0 && tags.length > 0;
  const loosen = useQueries({
    queries: (empty ? tags.slice(0, 9) : []).map((t) => ({
      queryKey: ["directory-loosen", q, fKey, t.key, t.value],
      queryFn: async () => ({ t, n: (await searchFn({ data: { q, ...without(t), pageSize: 1 } })).total }),
    })),
  });
  const suggestions = loosen.map((x) => x.data).filter((x): x is { t: Tag; n: number } => !!x && x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const clearAll = () => setFilters({ moods: [], categories: [], brands: [] });

  const openReel = (r: FacetedReel) => {
    if (r.kind === "site") setOpenSite(reels.find((x) => x.id === r.id) ?? null);
    else setOpen(allCards.find((c) => c.reel_id === r.id) ?? null);
  };

  return (
    <SiteShell>
      <main className="font-ap text-ap-ink">
        <section className="mx-auto max-w-[900px] px-6 pt-20 pb-6 text-center">
          <h1 className="mb-8 text-[clamp(30px,5vw,56px)] leading-[1.08] font-semibold tracking-[-0.035em] text-[#a1a1a6]">
            <b className="font-semibold text-ap-ink">
              <span className="text-[#a1a1a6]">Happy </span>
              <span className="text-ap-ink">{day}.</span>
              <span className="text-[#a1a1a6]"> Show me something:</span>
              <br />{" "}
            </b>
            <span className="text-ap-blue" aria-live="polite">
              <span className="font-light text-[#c7c7cc]">[ </span>
              <span key={mood} className="inline-block animate-[dir-mood_.3s_ease] motion-reduce:animate-none">{mood}</span>
              <span className="font-light text-[#c7c7cc]"> ]</span>
            </span>
          </h1>
          <form role="search" onSubmit={(e) => { e.preventDefault(); go(value); }}
            className="mx-auto flex h-[60px] max-w-[680px] items-center gap-2.5 rounded-[12px] border border-transparent bg-ap-panel pr-2 pl-5 transition-[background,border-color,box-shadow] motion-reduce:transition-none focus-within:border-ap-hairline focus-within:bg-ap-card focus-within:shadow-[0_10px_30px_rgba(20,30,50,.10)]">
            <input ref={input} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Try: cozy knitwear, square, Purl Soho"
              aria-label="Search the Directory" aria-keyshortcuts="/"
              className="h-full min-w-0 flex-1 bg-transparent text-[19px] outline-hidden placeholder:text-[#8e8e93]" />
            {value && (
              <button type="button" aria-label="Clear search" onClick={() => { setValue(""); go(""); }} className="grid size-8 place-items-center text-ap-muted">
                <X className="size-4" strokeWidth={1.7} />
              </button>
            )}
            <button type="submit" className="h-11 rounded-lg bg-ap-blue px-5 text-[16px] text-ap-card hover:bg-ap-blue-hover">Search</button>
          </form>
        </section>
        <div ref={sentinel} aria-hidden className="h-px" />
        <div className={cn("sticky top-16 z-30 px-6 transition-[background,padding] motion-reduce:transition-none",
          stuck ? "border-b border-ap-hairline bg-ap-card/80 py-2 backdrop-blur-xl" : "border-b border-transparent pb-2")}>
          <FilterBar value={filters} onChange={setFilters} facets={facets} total={total} families={families} brands={brands} compact={stuck} />
          {tags.length > 0 && (
            <ul className="mx-auto mt-2 flex max-w-[680px] flex-wrap items-center gap-1.5" aria-label="Active filters">
              {tags.map((t) => (
                <li key={`${t.key}-${t.value}`}>
                  <button type="button" onClick={() => setFilters(without(t))} aria-label={`Remove ${t.label}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-ap-panel pr-2 pl-2.5 text-[13px] hover:bg-ap-media">
                    {t.key === "moods" && <span aria-hidden className="size-2 rounded-full" style={{ background: MOOD_FAMILY_COLORS[famOf.get(t.value) as MoodFamily]?.bg }} />}
                    {t.label}
                    <X aria-hidden className="size-3.5 text-ap-muted" strokeWidth={1.7} />
                  </button>
                </li>
              ))}
              {tags.length >= 2 && <li><button type="button" onClick={clearAll} className="h-7 px-2 text-[13px] font-medium text-ap-blue">Clear all</button></li>}
            </ul>
          )}
        </div>

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
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Browse the directory</h2>
            <p className="text-[15px] text-ap-muted nums" aria-live="polite">
              {results.data ? (filtered ? `${total} of ${allTotal} reels` : `${total} ${total === 1 ? "reel" : "reels"}`) : ""}
            </p>
          </div>
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
                  {filters.moods.length > 0 && r.moods.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Moods">
                      {r.moods.map((m) => {
                        const hit = filters.moods.includes(m);
                        return <li key={m} className={cn("rounded-[4px] px-1.5 py-0.5 text-[11px]", hit ? "bg-ap-soft-blue font-medium text-ap-badge" : "text-ap-muted")}>{cap(m)}</li>;
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          {results.data && total === 0 && (
            filtered ? (
              <div role="status" className="rounded-[4px] bg-ap-panel px-6 py-10 text-center">
                <p className="text-[17px] font-semibold">Nothing matches all of that — try loosening one filter</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestions.map(({ t, n }) => (
                    <button key={`${t.key}-${t.value}`} type="button" onClick={() => setFilters(without(t))}
                      className="h-10 rounded-lg bg-ap-card px-4 text-[14px] shadow-ap-soft hover:bg-ap-soft-blue nums">
                      Remove “{t.label.split(" · ")[1]}” · {n}
                    </button>
                  ))}
                  {tags.length > 0 && <button type="button" onClick={clearAll} className="h-10 rounded-lg bg-ap-ink px-4 text-[14px] font-medium text-ap-card">Clear all filters</button>}
                </div>
              </div>
            ) : <p className="text-ap-muted" role="status">The first reels are on their way.</p>
          )}
          {results.data?.hasMore && (
            <div className="mt-8 text-center">
              <button type="button" disabled={results.isFetching}
                onClick={() => void navigate({ replace: true, resetScroll: false, search: (prev) => ({ ...prev, page: page + 1 }) })}
                className="h-11 rounded-lg bg-ap-panel px-5 text-[15px] font-medium hover:bg-ap-media disabled:opacity-60">
                {results.isFetching ? "Loading…" : "Show more reels"}
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
