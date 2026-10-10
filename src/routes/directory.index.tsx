import { ConceptReelNotice } from "@/components/directory/ConceptReelNotice";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useBrandSite } from "@/components/site/AimanteShell";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FilterBar, type FilterValue } from "@/components/directory/FilterBar";
import { BrandLink } from "@/components/directory/BrandLink";
import { HoverReelPreview } from "@/components/directory/HoverReelPreview";
import { DirectoryReelHeart } from "@/components/directory/LikeSave";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelDetail } from "@/components/directory/DirectoryGrid";
import { listPublicBrands, searchDirectory, searchDirectoryLegacy, type FacetedReel } from "@/lib/directory/directory.functions";
import { CATEGORIES, categorySlug, type DirectoryCard } from "@/lib/directory/directory";
import { MOOD_FAMILY_COLORS, type MoodFamily } from "@/lib/directory/mood-admin";
import { cn } from "@/lib/utils";
import { listSiteReels } from "@/lib/site/reels.functions";
import { aimanteTitle } from "@/lib/site/reels";
import { type SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { aimanteHead } from "@/lib/site/brand-site";
import { SiteReelHeart } from "@/components/site/SiteReelHeart";
import { SiteReelModal } from "@/components/site/SiteReelModal";
import { useMoodCatalog } from "@/lib/directory/moods";
import { FeaturedBand } from "@/components/directory/FeaturedBand";
import { DEFAULT_DIRECTORY_SETTINGS, SPEED_SECONDS } from "@/lib/directory/settings";
import { getDirectoryPublic } from "@/lib/directory/settings.functions";
import { useGreeting, logGreeting } from "@/components/directory/useGreeting";
import { rememberVisit } from "@/lib/directory/greeting";
import { recordDirectoryReelOpen } from "@/lib/directory/views.functions";

const POSTER =
  "absolute top-1/2 left-1/2 h-[72%] w-auto max-w-[72%] object-contain -translate-x-1/2 -translate-y-1/2 rounded-[6px] shadow-[0_0_0_1px_var(--ap-inner),0_18px_34px_-16px_rgba(29,29,31,.28)]";

// Moods the headline cycles through when none are picked.
const ROTATING = ["soothing", "energizing", "hopeful", "inspiring", "cozy", "luxurious", "playful"];
export const Route = createFileRoute("/directory/")({
  validateSearch: z.object({
    q: z.string().optional(), mood: z.string().optional(), category: z.string().optional(), brand: z.string().optional(),
    page: z.union([z.number(), z.string()]).optional(),
  }),
  loaderDeps: ({ search }) => ({ q: (search.q ?? "").slice(0, 200), category: search.category, mood: search.mood }),
  loader: async ({ deps, context }) => {
    // Lookups for the carousel, brand panel and reel pop-ups; the grid itself is filtered and paged on the server.
    const [dir, cards, reels, brands] = await Promise.all([
      getDirectoryPublic().catch(() => ({ settings: DEFAULT_DIRECTORY_SETTINGS, featured: [] as FacetedReel[] })),
      searchDirectoryLegacy({ data: { q: "", size: null } }).catch(() => [] as DirectoryCard[]),
      listSiteReels().then((rs) => rs.map((r) => ({ ...r, title: aimanteTitle(r) }))).catch(() => [] as SiteReel[]),
      listPublicBrands().catch(() => []),
    ]);
    return { q: deps.q, category: deps.category, mood: deps.mood, site: (context as { site?: string }).site, cards, reels, brands, settings: dir.settings, featuredReels: dir.featured };
  },
  head: ({ loaderData }) => {
    if (loaderData?.site === "aimante") {
      const cat = loaderData.category && !loaderData.category.includes(",") ? CATEGORIES.find((c) => categorySlug(c) === loaderData.category) : undefined;
      const mood = !cat && loaderData.mood && !loaderData.mood.includes(",") ? loaderData.mood : undefined;
      if (cat) return aimanteHead({ path: `/c/${loaderData.category}`, title: `${cat} video ads — Aimanté`, description: `Short video ads and Reels from ${cat} brands. Browse by mood and brand on Aimanté.` });
      if (mood) return aimanteHead({ path: `/mood/${encodeURIComponent(mood)}`, title: `${cap(mood)} video ads — Aimanté`, description: `Video ads and Reels that feel ${mood}, from independent brands on Aimanté.` });
      return aimanteHead({ path: "/", title: "Aimanté — Video ads by mood, category and brand", description: "Tell us your mood and we'll show you something. Browse short video ads and Reels from independent brands, by mood, category or brand." });
    }
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

/** Rotate words on every device; reduced-motion CSS disables transitions, not word changes. */
function useWeekdayMood(picked: string | undefined, pool: string[], lead?: string) {
  const words = pool.length ? pool : ROTATING;
  const [i, setI] = useState(0);
  const [leadOn, setLeadOn] = useState(true);
  useEffect(() => {
    if (!lead) return;
    setLeadOn(true);
    const t = setTimeout(() => setLeadOn(false), 6000);
    return () => clearTimeout(t);
  }, [lead]);
  const [day, setDay] = useState("today");
  useEffect(() => setDay(new Date().toLocaleDateString("en-US", { weekday: "long" })), []);
  useEffect(() => {
    if (picked || (lead && leadOn)) return;
    const t = setInterval(() => setI((x) => (x + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, [picked, words.length, lead, leadOn]);
  return { day, mood: picked ?? (lead && leadOn ? lead : words[i % words.length] ?? "soothing") };
}

const list = (v?: string) => (v ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 60) : []);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
type Tag = { key: keyof FilterValue; value: string; label: string };

function DirectoryPage() {
  const { cards: allCards, reels, brands, settings, featuredReels: featuredSet } = Route.useLoaderData();
  const PAGE = settings.pageSize;
  const isAim = useBrandSite() === "aimante";
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
  const recordOpen = useServerFn(recordDirectoryReelOpen);
  const input = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      if (input.current) input.current.placeholder = isAim && media.matches ? "Try: cozy knitwear, Purl Soho" : "Try: cozy knitwear, square, Purl Soho";
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [isAim]);

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
  // A shared ?page=3 loads pages 1–3 in one request; later pages are appended one at a time.
  const startPage = useRef(page);
  const keyRef = useRef(`${q}|${fKey}`);
  if (keyRef.current !== `${q}|${fKey}`) { keyRef.current = `${q}|${fKey}`; startPage.current = page; }
  const results = useInfiniteQuery({
    queryKey: ["directory-search", q, fKey],
    placeholderData: keepPreviousData,
    initialPageParam: startPage.current,
    queryFn: ({ pageParam }) => pageParam === startPage.current
      ? searchFn({ data: { q, ...filters, page: 1, pageSize: PAGE * pageParam } })
      : searchFn({ data: { q, ...filters, page: pageParam, pageSize: PAGE } }),
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.reels.length, 0);
      return loaded < last.total ? startPage.current + all.length : undefined;
    },
  });
  const loadedPages = startPage.current + Math.max(0, (results.data?.pages.length ?? 1) - 1);
  const [autoLeft, setAutoLeft] = useState(-1); // -1 until the first click
  const focusIdx = useRef<number | null>(null);
  const moreRef = useRef<HTMLAnchorElement>(null);
  const loadMore = (keyboard: boolean) => {
    if (!results.hasNextPage || results.isFetchingNextPage) return;
    if (keyboard) focusIdx.current = found.length;
    const next = loadedPages + 1;
    void results.fetchNextPage().then(() => navigate({ replace: true, resetScroll: false, search: (prev) => ({ ...prev, page: next }) }));
  };
  const everything = useQuery({ queryKey: ["directory-search-all"], staleTime: 60_000, queryFn: () => searchFn({ data: { pageSize: 1 } }) });
  const found = results.data?.pages.flatMap((p) => p.reels) ?? [];
  const total = results.data?.pages[0]?.total ?? 0;
  const allTotal = everything.data?.total ?? total;
  const allFacets = everything.data?.facets;
  const hasReels = (c: string | null, b: string | null) => {
    const bs = b ? brands.find((x) => x.name.toLowerCase() === b.toLowerCase())?.slug : null;
    return (!c || (allFacets?.categories[categorySlug(c)] ?? 0) > 0) && (!b || (!!bs && (allFacets?.brands[bs] ?? 0) > 0));
  };
  const greeting = useGreeting(hasReels, (settings.headlineMoods[0] ?? ROTATING[0])!, !!everything.data || everything.isError);
  const { day, mood } = useWeekdayMood(filters.moods.at(-1), settings.headlineMoods, greeting?.rule === "fallback" ? undefined : greeting?.mood);
  const moodClicked = useRef(false);
  const filterLogged = useRef(false);
  const anyFilter = !!q || filters.moods.length + filters.categories.length + filters.brands.length > 0;
  useEffect(() => {
    if (filters.moods.length) rememberVisit(filters.moods.at(-1));
    if (anyFilter && greeting && !moodClicked.current && !filterLogged.current) { filterLogged.current = true; logGreeting(greeting, "filter"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fKey, q, greeting]);
  const applyMood = () => {
    moodClicked.current = true;
    logGreeting(greeting, "mood_click");
    const bs = greeting?.brand ? brands.find((x) => x.name.toLowerCase() === greeting.brand!.toLowerCase())?.slug : undefined;
    setFilters({ moods: [mood.toLowerCase()], categories: greeting?.category && greeting.mood === mood ? [categorySlug(greeting.category)] : [], brands: bs && greeting?.mood === mood ? [bs] : [] });
    requestAnimationFrame(() => document.getElementById("directory-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const facets = results.data?.pages[0]?.facets ?? { moods: {}, categories: {}, brands: {} };
  const hasMore = !!results.hasNextPage;
  const remaining = Math.max(0, total - found.length);
  // Focus the first new card after a keyboard "Show more".
  useEffect(() => {
    if (focusIdx.current === null || found.length <= focusIdx.current) return;
    document.querySelector<HTMLElement>(`[data-reel-idx="${focusIdx.current}"] button`)?.focus();
    focusIdx.current = null;
  }, [found.length]);
  // After the first click, keep loading as the button nears the screen, a few pages at most.
  useEffect(() => {
    const el = moreRef.current;
    if (!el || autoLeft <= 0 || !hasMore) return;
    const io = new IntersectionObserver(([e]) => {
      if (e!.isIntersecting && !results.isFetchingNextPage) { setAutoLeft((n) => n - 1); loadMore(false); }
    }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLeft, hasMore, results.isFetchingNextPage, found.length]);
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

  // "Featured this week": featured reels when unfiltered; while filtering, follow the setting.
  const featured = settings;
  const matches = found.slice(0, featured.count);
  const featuredReels = !filtered || featured.whenFiltering === "fixed" ? featuredSet
    : !featured.showCarousel || featured.whenFiltering === "hide" || results.isPlaceholderData ? [] : matches;
  const featuredLabel = filtered && featured.whenFiltering === "follow" ? `Featured · ${total} ${total === 1 ? "match" : "matches"}` : featured.title;
  const openReel = (r: FacetedReel) => {
    if (r.kind === "site") {
      const reel = reels.find((x) => x.id === r.id);
      if (!reel) return;
      setOpenSite(reel);
    } else {
      const card = allCards.find((c) => c.reel_id === r.id);
      if (!card) return;
      setOpen(card);
    }
    void recordOpen({ data: { eventId: crypto.randomUUID(), reelId: r.id, kind: r.kind } }).catch(() => {});
  };

  return (
    <SiteShell>
      <div className={cn("font-ap text-ap-ink", isAim && "aimante-home")}>
        <section className="dir-intro mx-auto max-w-[900px] px-6 pt-20 pb-6 text-center">
          <h1 className="dir-headline mb-8 font-semibold text-ap-muted">
            {isAim && <span className="aimante-phone-greeting"><span>Happy <span className="text-ap-ink">{day}</span>.</span><span>Show me something:</span></span>}
            <b className={cn("dir-headline-greeting font-semibold text-ap-ink", isAim && "aimante-desktop-greeting")}>
              <span>
              <span key={greeting?.filled ?? "ssr"} className={greeting ? "animate-[dir-fade_.4s_ease] motion-reduce:animate-none" : undefined}>
                {greeting ? greeting.segments.map((g, k) => <span key={k} className={g.bold ? "text-ap-ink" : "text-ap-headline-muted"}>{g.text}</span>)
                  : <><span className="text-ap-headline-muted">Happy </span><span className="text-ap-ink">{day}.</span></>}
              </span>
              <span className="text-ap-headline-muted"> Show me something:</span>
              </span>
            </b>
            <span className="dir-headline-mood text-ap-blue" aria-live="polite">
              <span className="font-light text-ap-headline-bracket">[ </span>
              <Button variant="ghost" type="button" onClick={applyMood} aria-label={`Show ${mood} reels`} className="dir-mood-button h-auto min-w-0 rounded-lg p-0 text-inherit text-[length:inherit] font-semibold leading-[inherit] underline-offset-8 hover:bg-transparent hover:underline focus-visible:outline-2 focus-visible:outline-ap-blue">
                <span key={mood} className="inline-block animate-[dir-mood_.3s_ease] motion-reduce:animate-none">{mood}</span>
              </Button>
              <span className="font-light text-ap-headline-bracket"> ]</span>
            </span>
          </h1>
          <form role="search" onSubmit={(e) => { e.preventDefault(); go(value); }}
             className="dir-search-bar mx-auto flex h-[60px] max-w-[680px] items-center gap-2.5 rounded-[12px] border border-transparent bg-ap-panel pr-2 pl-5 transition-[background,border-color,box-shadow] motion-reduce:transition-none focus-within:border-ap-hairline focus-within:bg-ap-card focus-within:shadow-[0_10px_30px_rgba(20,30,50,.10)]">
            <input ref={input} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Try: cozy knitwear, square, Purl Soho"
              aria-label="Search the Directory" aria-keyshortcuts="/"
              className="dir-search-input h-full min-w-0 flex-1 bg-transparent text-[19px] outline-hidden placeholder:text-ap-muted" />
            {value && (
              <button type="button" aria-label="Clear search" onClick={() => { setValue(""); go(""); }} className="grid size-8 place-items-center text-ap-muted">
                <X className="size-4" strokeWidth={1.7} />
              </button>
            )}
            <Button variant="site" type="submit" className="h-11 shrink-0 rounded-lg bg-ap-blue px-5 text-[16px] text-ap-card hover:bg-ap-blue-hover">Search</Button>
          </form>
        </section>
        <div ref={sentinel} aria-hidden className="h-px" />
        <div className={cn("dir-filter-wrap sticky top-16 z-30 px-6 transition-[background,padding] motion-reduce:transition-none",
          stuck ? "border-b border-ap-hairline bg-ap-card/80 py-2 backdrop-blur-xl" : "border-b border-transparent pb-2")}>
          <FilterBar phoneStyle={isAim} comingSoon={settings.comingSoon} value={filters} onChange={setFilters} facets={facets} total={total} families={families} brands={brands} compact={stuck} />
          {isAim && <p className="mt-2 text-center text-[13px]"><Link to="/aimante/about" className="text-ap-blue hover:underline">New here? See how Aimanté works →</Link></p>}
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

        {featuredReels.length > 0 && (
          <FeaturedBand label={featuredLabel} reels={featuredReels} secondsPerReel={SPEED_SECONDS[featured.speed]}
            phoneStyle={isAim} filterGap={featured.filterCarouselGap} labelSize={featured.carouselLabelSize} labelGap={featured.carouselLabelGap}
            seconds={(r) => (r.kind === "site" ? reels.find((x) => x.id === r.id)?.seconds ?? null : null)} onOpen={openReel} />
        )}
        <section id="directory-results" className="mx-auto max-w-[1280px] scroll-mt-32 px-6 py-14" aria-busy={results.isFetching}>
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Browse the directory</h2>
            <p className="text-[15px] text-ap-muted nums" aria-live="polite">
              {results.data ? (filtered ? `${total} of ${allTotal} reels` : `${total} ${total === 1 ? "reel" : "reels"}`) : ""}
            </p>
          </div>
          {results.isPending && <SkeletonGrid n={PAGE} />}
          {found.length > 0 && (
            <ul className={cn("dir-results-grid grid gap-5 transition-opacity [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] motion-reduce:transition-none", results.isPlaceholderData && "opacity-50")}>
              {found.map((r, i) => (
                <li key={`${r.kind}-${r.id}`} data-reel-idx={i} className="dir-card-in relative" style={{ animationDelay: `${(i % PAGE) * 40}ms` }}>
                  <button type="button" onClick={() => openReel(r)} aria-label={`Open ${r.title}`}
                    className="dir-result-tile relative block aspect-square w-full overflow-hidden rounded-[8px] bg-ap-panel">
                    <HoverReelPreview video={r.video_url ?? r.preview_url} poster={r.poster} className={POSTER} />
                  </button>
                  {r.kind === "site" ? <SiteReelHeart reelId={r.id} name={r.title} /> : <DirectoryReelHeart reelId={r.id} name={`${r.brand_name} reel`} />}
                  <p className="dir-result-title mt-2.5 truncate text-[14px] font-semibold">{r.title}</p>
                  <p className="dir-result-meta truncate text-[12px] text-ap-muted"><BrandLink name={r.brand_name} slug={r.brand_slug} /> · {r.category}</p><ConceptReelNotice brandName={r.brand_name} brandSlug={r.brand_slug} />
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
          {results.isFetchingNextPage && <SkeletonGrid n={Math.min(PAGE, remaining)} className="mt-5" />}
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
          {found.length > 0 && !results.isPlaceholderData && (
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <p className="text-[14px] text-ap-muted nums">Showing {found.length} of {total} reels</p>
              <div className="h-1 w-[180px] overflow-hidden rounded-full bg-ap-inner" role="progressbar" aria-label="Reels loaded" aria-valuemin={0} aria-valuemax={total} aria-valuenow={found.length}>
                <div className="h-full rounded-full bg-ap-ink transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${total ? (found.length / total) * 100 : 0}%` }} />
              </div>
              {hasMore ? (
                <>
                  <link rel="next" href={`/directory?${nextQuery(search, loadedPages + 1)}`} />
                  <a ref={moreRef} href={`/directory?${nextQuery(search, loadedPages + 1)}`}
                    onClick={(e) => { e.preventDefault(); if (autoLeft < 0) setAutoLeft(settings.autoLoadPages); loadMore(e.detail === 0); }}
                    aria-disabled={results.isFetchingNextPage}
                    className="mt-1 inline-flex h-11 items-center rounded-lg bg-ap-panel px-5 text-[15px] font-medium text-ap-ink hover:bg-ap-media nums">
                    {results.isFetchingNextPage ? "Loading…" : `Show ${Math.min(PAGE, remaining)} more`}
                  </a>
                </>
              ) : (
                <p className="text-[14px] text-ap-muted">
                  You've seen them all ·{" "}
                  <button type="button" onClick={() => { window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); input.current?.focus({ preventScroll: true }); }} className="font-medium text-ap-blue">Back to top ↑</button>
                </p>
              )}
              {!hasMore && isAim && (
                <p className="aimante-list-link text-[14px] text-ap-muted"><Link to="/aimante/join" className="font-medium text-ap-blue hover:underline">Your brand here? List it free →</Link></p>
              )}
            </div>
          )}
        </section>
      </div>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
      <SiteReelModal reel={openSite} tags={found.find((r) => r.id === openSite?.id)?.moods ?? featuredSet.find((r) => r.id === openSite?.id)?.moods ?? []} onClose={() => setOpenSite(null)} />
    </SiteShell>
  );
}

function nextQuery(search: Record<string, unknown>, page: number) {
  const p = new URLSearchParams();
  for (const k of ["q", "mood", "category", "brand"]) { const v = search[k]; if (typeof v === "string" && v) p.set(k, v); }
  p.set("page", String(page));
  return p.toString();
}

function SkeletonGrid({ n, className }: { n: number; className?: string }) {
  return (
    <ul aria-hidden className={cn("dir-results-grid grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]", className)}>
      {Array.from({ length: n }, (_, i) => (
        <li key={i}>
          <div className="aspect-square w-full animate-pulse rounded-[8px] bg-ap-panel motion-reduce:animate-none" />
          <div className="mt-2.5 h-3.5 w-3/4 rounded-[4px] bg-ap-panel" />
          <div className="mt-1.5 h-3 w-1/2 rounded-[4px] bg-ap-panel" />
        </li>
      ))}
    </ul>
  );
}
