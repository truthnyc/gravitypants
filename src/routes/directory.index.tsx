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
import {
  listPublicBrands,
  searchDirectory,
  searchDirectoryLegacy,
  type FacetedReel,
} from "@/lib/directory/directory.functions";
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
import { parseSearch } from "@/lib/directory/parse-search";
const SUGGESTIONS = ["Something cozy for a host", "Elegant jewellery", "Bold fashion", "Calm for the home"];
import { ReelNavContext, type ReelNav } from "@/components/directory/ReelPopup";
import { useMoodCatalog } from "@/lib/directory/moods";
import { FeaturedBand } from "@/components/directory/FeaturedBand";
import { DEFAULT_DIRECTORY_SETTINGS, SPEED_SECONDS } from "@/lib/directory/settings";
import { getDirectoryPublic } from "@/lib/directory/settings.functions";
import { useGreeting, logGreeting } from "@/components/directory/useGreeting";
import { rememberVisit } from "@/lib/directory/greeting";
import { recordDirectoryReelOpen } from "@/lib/directory/views.functions";
import { getListingIntro } from "@/lib/directory/categories.functions";
import { listGuides } from "@/lib/directory/guides.functions";
import { guideForEvent, guidesMatching } from "@/lib/directory/guides";
import { brandCount, MIN_LISTING_BRANDS, list } from "@/lib/directory/listing";
import { AIMANTE_ORIGIN } from "@/lib/site/brand-site";

const POSTER_RING = "rounded-[6px] shadow-[0_0_0_1px_var(--ap-inner),0_18px_34px_-16px_rgba(29,29,31,.28)]";
/** The poster box takes the reel's own shape, so the ring fits the image on every size. */
const posterFor = (format: string | undefined) =>
  format === "16x9"
    ? `absolute top-1/2 left-1/2 w-[88%] aspect-[16/9] object-contain -translate-x-1/2 -translate-y-1/2 ${POSTER_RING}`
    : format === "5x4"
      ? `absolute top-1/2 left-1/2 w-[84%] aspect-[5/4] object-contain -translate-x-1/2 -translate-y-1/2 ${POSTER_RING}`
      : `absolute top-1/2 left-1/2 h-auto w-auto max-h-[72%] max-w-[72%] object-contain -translate-x-1/2 -translate-y-1/2 ${POSTER_RING}`;

// Moods the headline cycles through when none are picked.
const ROTATING = ["soothing", "energizing", "hopeful", "inspiring", "cozy", "luxurious", "playful"];
export const Route = createFileRoute("/directory/")({
  validateSearch: z.object({
    q: z.string().optional(),
    mood: z
      .string()
      .optional()
      .transform((v) =>
        v
          ?.split(",")
          .map((m) => (m.trim().toLowerCase() === "urgent" ? "lively" : m))
          .join(","),
      ), // old ?mood=urgent links still work
    category: z.string().optional(),
    brand: z.string().optional(),
    page: z.union([z.number(), z.string()]).optional(),
  }),
  loaderDeps: ({ search }) => ({
    q: (search.q ?? "").slice(0, 200),
    category: search.category,
    mood: search.mood,
    brand: search.brand,
  }),
  loader: async ({ deps, context }) => {
    // Lookups for the carousel, brand panel and reel pop-ups; the grid itself is filtered and paged on the server.
    const dirP = getDirectoryPublic().catch(() => ({
      settings: DEFAULT_DIRECTORY_SETTINGS,
      featured: [] as FacetedReel[],
    }));
    const filters = { moods: list(deps.mood), categories: list(deps.category), brands: list(deps.brand) };
    // One shuffle seed per visit: the grid order changes between visits but stays stable while paging.
    const seed = visitSeed();
    // First page of results is server-rendered so crawlers see every card before JavaScript runs.
    const initialP = dirP
      .then((d) => searchDirectory({ data: { q: deps.q, ...filters, page: 1, pageSize: d.settings.pageSize, seed } }))
      .catch(() => null);
    const single =
      !deps.q && !deps.brand
        ? deps.category && !deps.category.includes(",") && !deps.mood
          ? { kind: "category" as const, slug: deps.category }
          : deps.mood && !deps.mood.includes(",") && !deps.category
            ? { kind: "mood" as const, slug: deps.mood }
            : null
        : null;
    const introP = single ? getListingIntro({ data: single }).catch(() => null) : Promise.resolve(null);
    const [dir, initial, listing, cards, reels, brands, guides] = await Promise.all([
      dirP,
      initialP,
      introP,
      searchDirectoryLegacy({ data: { q: "", size: null } }).catch(() => [] as DirectoryCard[]),
      listSiteReels()
        .then((rs) => rs.filter((r) => r.source !== "client").map((r) => ({ ...r, title: aimanteTitle(r) })))
        .catch(() => [] as SiteReel[]),
      listPublicBrands().catch(() => []),
      (context as { site?: string }).site === "aimante" ? listGuides().catch(() => []) : Promise.resolve([]),
    ]);
    return {
      q: deps.q,
      category: deps.category,
      mood: deps.mood,
      site: (context as { site?: string }).site,
      cards,
      reels,
      brands,
      settings: dir.settings,
      featuredReels: dir.featured,
      initial,
      initialKey: `${deps.q}|${JSON.stringify(filters)}`,
      seed,
      listing: single && listing ? { ...single, ...listing } : null,
      brandCount: brandCount(initial?.facets),
      guides: guides.map((g) => ({
        slug: g.slug,
        title: g.title,
        moods: g.moods,
        categories: g.categories,
        season: g.season,
      })),
    };
  },
  head: ({ loaderData }) => {
    if (loaderData?.site === "aimante") {
      const cat =
        loaderData.category && !loaderData.category.includes(",")
          ? CATEGORIES.find((c) => categorySlug(c) === loaderData.category)
          : undefined;
      const mood = !cat && loaderData.mood && !loaderData.mood.includes(",") ? loaderData.mood : undefined;
      const listing =
        cat || mood
          ? listingHead(
              loaderData,
              cat ? `/c/${loaderData.category}` : `/mood/${encodeURIComponent(mood!)}`,
              cat ? `${cat} brands` : `${cap(mood!)} brands and gift ideas`,
            )
          : null;
      if (cat)
        return withLd(
          aimanteHead({
            path: `/c/${loaderData.category}`,
            title: `${cat} video ads — Aimanté`,
            description:
              loaderData.listing?.meta ||
              `Short video ads and Reels from ${cat} brands. Browse by mood and brand on Aimanté.`,
          }),
          listing!,
        );
      if (mood)
        return withLd(
          aimanteHead({
            path: `/mood/${encodeURIComponent(mood)}`,
            title: `${cap(mood)} video ads — Aimanté`,
            description:
              loaderData.listing?.meta || `Video ads and Reels that feel ${mood}, from independent brands on Aimanté.`,
          }),
          listing!,
        );
      return withLd(
        aimanteHead({
          path: "/",
          title: "Aimanté — Discover brands by mood",
          description:
            "Tell us how you'd like to feel and we'll show you something. Short reels from independent makers and well-known houses, by mood, category or brand.",
        }),
        {
          noindex: false,
          ld: [
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${AIMANTE_ORIGIN}/#website`,
              name: "Aimanté",
              url: `${AIMANTE_ORIGIN}/`,
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${AIMANTE_ORIGIN}/#org`,
              name: "Aimanté",
              url: `${AIMANTE_ORIGIN}/`,
              logo: `${AIMANTE_ORIGIN}/apple-touch-icon.png`,
            },
          ],
        },
      );
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
  return { day, mood: picked ?? (lead && leadOn ? lead : (words[i % words.length] ?? "soothing")) };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type HeadOut = { meta?: any[]; links?: any[]; scripts?: any[] }; // eslint-disable-line @typescript-eslint/no-explicit-any
/** Distinct brands on a listing, in the order their reels appear. */
function brandsInOrder(reels: FacetedReel[] | undefined) {
  const seen = new Set<string>();
  return (reels ?? [])
    .filter((r) => r.brand_slug && !seen.has(r.brand_slug) && seen.add(r.brand_slug))
    .map((r) => ({ name: r.brand_name, slug: r.brand_slug }));
}
/** CollectionPage + ItemList of brand pages, and noindex while a listing has too few brands. */
function listingHead(
  d: { initial: { reels: FacetedReel[] } | null; brandCount: number; listing: { intro: string } | null },
  path: string,
  name: string,
) {
  const items = brandsInOrder(d.initial?.reels);
  return {
    noindex: d.brandCount < MIN_LISTING_BRANDS,
    ld: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        url: `${AIMANTE_ORIGIN}${path}`,
        ...(d.listing?.intro ? { description: d.listing.intro } : {}),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: items.length,
          itemListElement: items.map((b, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: b.name,
            url: `${AIMANTE_ORIGIN}/b/${b.slug}`,
          })),
        },
      },
    ],
  };
}
function withLd(head: HeadOut, { noindex, ld }: { noindex: boolean; ld: object[] }): HeadOut {
  return {
    ...head,
    meta: [
      ...(head.meta ?? []).filter((m) => m?.name !== "robots"),
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
    scripts: [
      ...(head.scripts ?? []),
      ...ld.map((x) => ({ type: "application/ld+json", children: JSON.stringify(x) })),
    ],
  };
}
type Tag = { key: keyof FilterValue; value: string; label: string };

// Server renders get a fresh seed per request; in the browser one seed lives for the whole visit,
// so loader reruns (e.g. ?page= changes from Load more) never reshuffle already-loaded pages.
let browserSeed: string | null = null;
function visitSeed() {
  if (typeof window === "undefined") return crypto.randomUUID();
  return (browserSeed ??= crypto.randomUUID());
}

function DirectoryPage() {
  const {
    cards: allCards,
    reels,
    brands,
    settings,
    featuredReels: featuredSet,
    initial,
    initialKey,
    seed,
    listing,
    guides,
  } = Route.useLoaderData();
  const PAGE = settings.pageSize;
  const isAim = useBrandSite() === "aimante";
  const search = Route.useSearch();
  const q = (search.q ?? "").slice(0, 200);
  const page = Math.min(Math.max(1, Math.floor(Number(search.page) || 1)), 20);
  const filters: FilterValue = {
    moods: list(search.mood),
    categories: list(search.category),
    brands: list(search.brand),
  };
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
      if (input.current) input.current.placeholder = "Try “something cozy for a host”";
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [isAim]);

  useEffect(() => setValue(q), [q]);
  const go = (v: string) =>
    void navigate({
      replace: true,
      resetScroll: false,
      search: (prev) => ({ ...prev, q: v.trim() || undefined, page: undefined }),
    });
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
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t.closest("input, textarea, select, [contenteditable=true]"))
        return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, []);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e!.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // What the last typed sentence was read as; cleared whenever filters change by hand.
  const [readAs, setReadAs] = useState<{ line: string; occasion: string | null } | null>(null);
  const setFilters = (f: FilterValue) => { setReadAs(null); applyFilters(f); };
  const applyFilters = (f: FilterValue, q?: string) =>
    void navigate({
      replace: true,
      resetScroll: false,
      search: (prev) => ({
        ...prev,
        mood: f.moods.join(",") || undefined,
        category: f.categories.join(",") || undefined,
        brand: f.brands.join(",") || undefined,
        ...(q !== undefined ? { q: q || undefined } : {}),
        page: undefined,
      }),
    });
  const runSentence = (text: string) => {
    const t = text.trim();
    if (!t) { setReadAs(null); go(""); return; }
    const p = parseSearch(t, { moods: families.flatMap((f) => f.moods), brands });
    if (!p.mood && !p.brand && p.categories.length === 0) {
      setReadAs({ line: "No mood or category words found, so this is a plain text search.", occasion: null });
      go(t);
      return;
    }
    const catNames = p.categories.map((c) => CATEGORIES.find((x) => categorySlug(x) === c) ?? c);
    const parts = [p.mood && `mood ${cap(p.mood)}`, catNames.length && `category ${catNames.join(", ")}`, p.brand && `brand ${brands.find((b) => b.slug === p.brand)?.name ?? p.brand}`].filter(Boolean);
    setValue("");
    applyFilters({ moods: p.mood ? [p.mood] : [], categories: p.categories, brands: p.brand ? [p.brand] : [] }, "");
    setReadAs({ line: `Read as: ${parts.join(" · ")}`, occasion: p.occasion ? `${p.occasion} (${p.categories.length})` : null });
  };
  const searchFn = useServerFn(searchDirectory);
  if (typeof window !== "undefined" && !browserSeed) browserSeed = seed;
  // A shared ?page=3 loads pages 1–3 in one request; later pages are appended one at a time.
  const startPage = useRef(page);
  const keyRef = useRef(`${q}|${fKey}`);
  if (keyRef.current !== `${q}|${fKey}`) {
    keyRef.current = `${q}|${fKey}`;
    startPage.current = page;
  }
  const results = useInfiniteQuery({
    queryKey: ["directory-search", q, fKey, seed],
    placeholderData: keepPreviousData,
    // The loader already fetched page 1 on the server, so cards are in the first HTML.
    ...(initial && startPage.current === 1 && initialKey === `${q}|${fKey}`
      ? { initialData: { pages: [initial], pageParams: [1] } }
      : {}),
    initialPageParam: startPage.current,
    queryFn: ({ pageParam }) =>
      pageParam === startPage.current
        ? searchFn({ data: { q, ...filters, page: 1, pageSize: PAGE * pageParam, seed } })
        : searchFn({ data: { q, ...filters, page: pageParam, pageSize: PAGE, seed } }),
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
    void results
      .fetchNextPage()
      .then(() => navigate({ replace: true, resetScroll: false, search: (prev) => ({ ...prev, page: next }) }));
  };
  const everything = useQuery({
    queryKey: ["directory-search-all"],
    staleTime: 60_000,
    queryFn: () => searchFn({ data: { pageSize: 1 } }),
  });
  const found = results.data?.pages.flatMap((p) => p.reels) ?? [];
  const total = results.data?.pages[0]?.total ?? 0;
  const allTotal = everything.data?.total ?? total;
  const allFacets = everything.data?.facets;
  const hasReels = (c: string | null, b: string | null) => {
    const bs = b ? brands.find((x) => x.name.toLowerCase() === b.toLowerCase())?.slug : null;
    return (
      (!c || (allFacets?.categories[categorySlug(c)] ?? 0) > 0) && (!b || (!!bs && (allFacets?.brands[bs] ?? 0) > 0))
    );
  };
  const greeting = useGreeting(
    hasReels,
    (settings.headlineMoods[0] ?? ROTATING[0])!,
    !!everything.data || everything.isError,
  );
  // Only rotate/suggest moods that currently have live reels, so clicking never opens an empty grid.
  const liveMood = (m: string | undefined) => !!m && (allFacets?.moods[m.toLowerCase()] ?? 0) > 0;
  const configured = settings.headlineMoods.length ? settings.headlineMoods : ROTATING;
  const livePool = allFacets ? configured.filter(liveMood) : configured;
  const fallbackPool =
    allFacets && !livePool.length
      ? Object.entries(allFacets.moods)
          .filter(([, n]) => n > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([m]) => m)
          .slice(0, 7)
      : [];
  const pool = livePool.length ? livePool : fallbackPool.length ? fallbackPool : configured;
  const leadMood =
    greeting && greeting.rule !== "fallback" && (!allFacets || liveMood(greeting.mood)) ? greeting.mood : undefined;
  const { day, mood } = useWeekdayMood(filters.moods.at(-1), pool, leadMood);
  const moodClicked = useRef(false);
  const filterLogged = useRef(false);
  const anyFilter = !!q || filters.moods.length + filters.categories.length + filters.brands.length > 0;
  useEffect(() => {
    if (filters.moods.length) rememberVisit(filters.moods.at(-1));
    if (anyFilter && greeting && !moodClicked.current && !filterLogged.current) {
      filterLogged.current = true;
      logGreeting(greeting, "filter");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fKey, q, greeting]);
  const applyMood = () => {
    moodClicked.current = true;
    logGreeting(greeting, "mood_click");
    const bs = greeting?.brand
      ? brands.find((x) => x.name.toLowerCase() === greeting.brand!.toLowerCase())?.slug
      : undefined;
    setFilters({
      moods: [mood.toLowerCase()],
      categories: greeting?.category && greeting.mood === mood ? [categorySlug(greeting.category)] : [],
      brands: bs && greeting?.mood === mood ? [bs] : [],
    });
    requestAnimationFrame(() =>
      document.getElementById("directory-results")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
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
    const io = new IntersectionObserver(
      ([e]) => {
        if (e!.isIntersecting && !results.isFetchingNextPage) {
          setAutoLeft((n) => n - 1);
          loadMore(false);
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLeft, hasMore, results.isFetchingNextPage, found.length]);
  const filtered = !!q || filters.moods.length + filters.categories.length + filters.brands.length > 0;

  const famOf = new Map(families.flatMap((f) => f.moods.map((m) => [m, f.family] as const)));
  const tags: Tag[] = [
    ...filters.moods.map((v) => ({ key: "moods" as const, value: v, label: `Mood · ${cap(v)}` })),
    ...filters.categories.map((v) => ({
      key: "categories" as const,
      value: v,
      label: `Category · ${CATEGORIES.find((c) => categorySlug(c) === v) ?? v}`,
    })),
    ...filters.brands.map((v) => ({
      key: "brands" as const,
      value: v,
      label: `Brand · ${brands.find((b) => b.slug === v)?.name ?? v}`,
    })),
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
  const suggestions = loosen
    .map((x) => x.data)
    .filter((x): x is { t: Tag; n: number } => !!x && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);
  const clearAll = () => setFilters({ moods: [], categories: [], brands: [] });

  // "Featured this week": featured reels when unfiltered; while filtering, follow the setting.
  const featured = settings;
  const matches = found.slice(0, featured.count);
  const featuredReels =
    !filtered || featured.whenFiltering === "fixed"
      ? featuredSet
      : !featured.showCarousel || featured.whenFiltering === "hide" || results.isPlaceholderData
        ? []
        : matches;
  const featuredLabel =
    filtered && featured.whenFiltering === "follow"
      ? `Featured · ${total} ${total === 1 ? "match" : "matches"}`
      : featured.title;
  const opener = useRef<HTMLElement | null>(null);
  const [navList, setNavList] = useState<{ list: FacetedReel[]; index: number } | null>(null);
  const showReel = (r: FacetedReel) => {
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
  const openReel = (r: FacetedReel, list: FacetedReel[] = found) => {
    const index = list.findIndex((x) => x.id === r.id && x.kind === r.kind);
    setNavList(index >= 0 ? { list, index } : null);
    opener.current = document.activeElement as HTMLElement | null;
    showReel(r);
  };
  const stepTo = (index: number) => {
    const target = navList?.list[index];
    if (!navList || !target) return;
    setOpen(null);
    setOpenSite(null);
    setNavList({ list: navList.list, index });
    showReel(target);
  };
  const closeReel = () => {
    setOpen(null); setOpenSite(null); setNavList(null);
    const el = opener.current;
    if (el) setTimeout(() => el.focus({ preventScroll: true }), 0);
  };
  const activeMood = filters.moods.at(-1)?.toLowerCase();
  const reelNav: ReelNav | null = navList ? {
    index: navList.index, total: navList.list.length,
    onPrev: () => stepTo(navList.index - 1), onNext: () => stepTo(navList.index + 1),
    mood: activeMood,
    fit: activeMood ? [activeMood, ...families.filter((f) => f.moods.some((m) => m.toLowerCase() === activeMood)).flatMap((f) => f.moods.map((m) => m.toLowerCase()))] : undefined,
  } : null;

  return (
    <SiteShell>
      <div className={cn("font-ap text-ap-ink", isAim && "aimante-home")}>
        <section className="dir-intro mx-auto max-w-[900px] px-6 pt-20 pb-6 text-center">
          <h1 className="dir-page-title mb-3 text-[13px] font-semibold tracking-[0.06em] text-ap-muted uppercase">
            {listing
              ? listing.kind === "category"
                ? `${listing.name} brands`
                : `${cap(listing.name)} brands and gift ideas`
              : "Discover brands by mood"}
          </h1>
          {listing?.intro && (
            <p className="dir-page-intro mx-auto mb-6 max-w-[620px] text-[16px] leading-[1.5] text-ap-body">
              {listing.intro}
            </p>
          )}
          {listing &&
            (() => {
              const related = guidesMatching(guides, listing.kind, listing.name);
              return (
                related.length > 0 && (
                  <nav
                    aria-label="Related guides"
                    className="mx-auto -mt-2 mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[14px]"
                  >
                    <span className="text-ap-muted">Guides:</span>
                    {related.map((g) => (
                      <Link
                        key={g.slug}
                        to="/aimante/guides/$slug"
                        params={{ slug: g.slug }}
                        className="font-medium text-ap-blue hover:underline"
                      >
                        {g.title}
                      </Link>
                    ))}
                  </nav>
                )
              );
            })()}
          <div className="dir-headline mb-8 font-semibold text-ap-muted">
            <b className={cn("dir-headline-greeting font-semibold text-ap-ink", isAim && "aimante-desktop-greeting")}>
              <span>
                <span
                  key={greeting?.filled ?? "ssr"}
                  className={greeting ? "animate-[dir-fade_.4s_ease] motion-reduce:animate-none" : undefined}
                >
                  {greeting ? (
                    greeting.segments.map((g, k) => (
                      <span key={k} className={g.bold ? "text-ap-ink" : "text-ap-headline-muted"}>
                        {g.text}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="text-ap-headline-muted">Happy </span>
                      <span className="text-ap-ink">{day}.</span>
                    </>
                  )}
                </span>
                <span className="text-ap-headline-muted"> Show me something:</span>
              </span>
            </b>
            <span className="dir-headline-mood text-ap-blue" aria-live="polite">
              <span className="font-light text-ap-headline-bracket">[ </span>
              <Button
                variant="ghost"
                type="button"
                onClick={applyMood}
                aria-label={`Show ${mood} reels`}
                className="dir-mood-button h-auto min-w-0 rounded-lg p-0 text-inherit text-[length:inherit] font-semibold leading-[inherit] underline-offset-8 hover:bg-transparent hover:underline focus-visible:outline-2 focus-visible:outline-ap-blue"
              >
                <span key={mood} className="inline-block animate-[dir-mood_.3s_ease] motion-reduce:animate-none">
                  {mood}
                </span>
              </Button>
              <span className="font-light text-ap-headline-bracket"> ]</span>
            </span>
          </div>
          {(() => {
            const sg = greeting?.rule === "countdown" ? guideForEvent(guides, greeting.eventId) : undefined;
            return (
              sg && (
                <p className="-mt-5 mb-6 text-[14px]">
                  <Link
                    to="/aimante/guides/$slug"
                    params={{ slug: sg.slug }}
                    className="font-medium text-ap-blue hover:underline"
                  >
                    {sg.title} →
                  </Link>
                </p>
              )
            );
          })()}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              runSentence(value);
            }}
            className="dir-search-bar mx-auto flex h-[60px] max-w-[680px] items-center gap-2.5 rounded-[12px] border border-transparent bg-ap-panel pr-2 pl-5 transition-[background,border-color,box-shadow] motion-reduce:transition-none focus-within:border-ap-hairline focus-within:bg-ap-card focus-within:shadow-[0_10px_30px_rgba(20,30,50,.10)]"
          >
            <input
              ref={input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Try “something cozy for a host”"
              aria-label="Search the Directory"
              aria-keyshortcuts="/"
              className="dir-search-input h-full min-w-0 flex-1 bg-transparent text-[19px] outline-hidden placeholder:text-ap-muted"
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
            <Button
              variant="site"
              type="submit"
              className="h-11 shrink-0 rounded-lg bg-ap-blue px-5 text-[16px] text-ap-card hover:bg-ap-blue-hover"
            >
              Search
            </Button>
          </form>
          <ul className="mx-auto mt-3 flex max-w-[680px] flex-wrap justify-center gap-2" aria-label="Search suggestions">
            {SUGGESTIONS.map((sg) => (
              <li key={sg}>
                <button type="button" onClick={() => { setValue(sg); runSentence(sg); }}
                  className="rounded-full border border-ap-hairline bg-ap-card px-3 py-1 text-[13px] text-ap-body hover:border-ap-blue hover:text-ap-blue">
                  {sg}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <div ref={sentinel} aria-hidden className="h-px" />
        <div
          className={cn(
            "dir-filter-wrap sticky top-16 z-30 px-6 transition-[background,padding] motion-reduce:transition-none",
            stuck
              ? "border-b border-ap-hairline bg-ap-card/80 py-2 backdrop-blur-xl"
              : "border-b border-transparent pb-2",
          )}
        >
          <FilterBar
            phoneStyle={isAim}
            comingSoon={settings.comingSoon}
            value={filters}
            onChange={setFilters}
            facets={facets}
            total={total}
            families={families}
            brands={brands}
            compact={stuck}
            categoryLabel={readAs?.occasion ?? undefined}
          />
          {readAs && <p className="mt-2 text-center text-[13px] text-ap-body" aria-live="polite">{readAs.line}</p>}
          {isAim && (
            <p className="mt-2 text-center text-[13px]">
              <Link to="/aimante/about" className="text-ap-blue hover:underline">
                New to Aimanté? How it works →
              </Link>
            </p>
          )}
          {tags.length > 0 && (
            <ul className="mx-auto mt-2 flex max-w-[680px] flex-wrap items-center gap-1.5" aria-label="Active filters">
              {tags.map((t) => (
                <li key={`${t.key}-${t.value}`}>
                  <button
                    type="button"
                    onClick={() => setFilters(without(t))}
                    aria-label={`Remove ${t.label}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-ap-panel pr-2 pl-2.5 text-[13px] hover:bg-ap-media"
                  >
                    {t.key === "moods" && (
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ background: MOOD_FAMILY_COLORS[famOf.get(t.value) as MoodFamily]?.bg }}
                      />
                    )}
                    {t.label}
                    <X aria-hidden className="size-3.5 text-ap-muted" strokeWidth={1.7} />
                  </button>
                </li>
              ))}
              {tags.length >= 2 && (
                <li>
                  <button type="button" onClick={clearAll} className="h-7 px-2 text-[13px] font-medium text-ap-blue">
                    Clear all
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {featuredReels.length > 0 && (
          <FeaturedBand
            label={featuredLabel}
            reels={featuredReels}
            secondsPerReel={SPEED_SECONDS[featured.speed]}
            phoneStyle={isAim}
            filterGap={featured.filterCarouselGap}
            labelSize={featured.carouselLabelSize}
            labelGap={featured.carouselLabelGap}
            seconds={(r) => (r.kind === "site" ? (reels.find((x) => x.id === r.id)?.seconds ?? null) : null)}
            onOpen={(r: FacetedReel) => openReel(r, featuredReels)}
          />
        )}
        <section
          id="directory-results"
          className="mx-auto max-w-[1280px] scroll-mt-32 px-6 py-14"
          aria-busy={results.isFetching}
        >
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Browse the directory</h2>
            <p className="text-[15px] text-ap-muted nums" aria-live="polite">
              {results.data
                ? filtered
                  ? `${total} of ${allTotal} reels`
                  : `${total} ${total === 1 ? "reel" : "reels"}`
                : ""}
            </p>
          </div>
          {results.isPending && <SkeletonGrid n={PAGE} />}
          {found.length > 0 && (
            <ul
              className={cn(
                "dir-results-grid grid gap-5 transition-opacity [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] motion-reduce:transition-none",
                results.isPlaceholderData && "opacity-50",
              )}
            >
              {found.map((r, i) => (
                <li
                  key={`${r.kind}-${r.id}`}
                  data-reel-idx={i}
                  className="dir-card-in relative"
                  style={{ animationDelay: `${(i % PAGE) * 40}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => openReel(r)}
                    aria-label={`Open ${r.title}`}
                    className="dir-result-tile relative block aspect-square w-full overflow-hidden rounded-[8px] bg-ap-panel"
                  >
                    <HoverReelPreview
                      video={r.video_url ?? r.preview_url}
                      poster={r.poster}
                      alt={`${r.brand_name} reel thumbnail`}
                      className={posterFor(r.formats[0])}
                    />
                  </button>
                  {r.kind === "site" ? (
                    <SiteReelHeart reelId={r.id} name={r.title} />
                  ) : (
                    <DirectoryReelHeart reelId={r.id} name={`${r.brand_name} reel`} />
                  )}
                  <p className="dir-result-title mt-2.5 truncate text-[14px] font-semibold">{r.title}</p>
                  <p className="dir-result-meta truncate text-[12px] text-ap-muted">
                    <BrandLink name={r.brand_name} slug={r.brand_slug} /> · {r.category}
                  </p>
                  <ConceptReelNotice brandName={r.brand_name} brandSlug={r.brand_slug} />
                  {(filters.moods.length > 0 || filters.categories.length > 0) && r.moods.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Moods">
                      {r.moods.map((m) => {
                        const hit = filters.moods.includes(m);
                        return (
                          <li
                            key={m}
                            className={cn(
                              "rounded-[4px] px-1.5 py-0.5 text-[11px]",
                              hit ? "bg-ap-soft-blue font-medium text-ap-badge" : "text-ap-muted",
                            )}
                          >
                            {cap(m)}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          {results.isFetchingNextPage && <SkeletonGrid n={Math.min(PAGE, remaining)} className="mt-5" />}
          {results.data &&
            total === 0 &&
            (filtered ? (
              <div role="status" className="rounded-[4px] bg-ap-panel px-6 py-10 text-center">
                <p className="text-[17px] font-semibold">
                  Nothing quite matches yet. Try removing one filter, or start with a mood.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["soothing", "elegant", "cozy", "playful", "bold", "inspiring"].map((m) => (
                    <Link
                      key={m}
                      to="/directory"
                      search={{ mood: m }}
                      className="inline-flex h-10 items-center rounded-lg bg-ap-card px-4 text-[14px] shadow-ap-soft hover:bg-ap-soft-blue"
                    >
                      {m}
                    </Link>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestions.map(({ t, n }) => (
                    <button
                      key={`${t.key}-${t.value}`}
                      type="button"
                      onClick={() => setFilters(without(t))}
                      className="h-10 rounded-lg bg-ap-card px-4 text-[14px] shadow-ap-soft hover:bg-ap-soft-blue nums"
                    >
                      Remove “{t.label.split(" · ")[1]}” · {n}
                    </button>
                  ))}
                  {tags.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="h-10 rounded-lg bg-ap-ink px-4 text-[14px] font-medium text-ap-card"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-ap-muted" role="status">
                The first reels are on their way.
              </p>
            ))}
          {found.length > 0 && !results.isPlaceholderData && (
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <p className="text-[14px] text-ap-muted nums">
                Showing {found.length} of {total} reels
              </p>
              <div
                className="h-1 w-[180px] overflow-hidden rounded-full bg-ap-inner"
                role="progressbar"
                aria-label="Reels loaded"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={found.length}
              >
                <div
                  className="h-full rounded-full bg-ap-ink transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${total ? (found.length / total) * 100 : 0}%` }}
                />
              </div>
              {hasMore ? (
                <>
                  <link rel="next" href={`/directory?${nextQuery(search, loadedPages + 1)}`} />
                  <a
                    ref={moreRef}
                    href={`/directory?${nextQuery(search, loadedPages + 1)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (autoLeft < 0) setAutoLeft(settings.autoLoadPages);
                      loadMore(e.detail === 0);
                    }}
                    aria-disabled={results.isFetchingNextPage}
                    className="mt-1 inline-flex h-11 items-center rounded-lg bg-ap-panel px-5 text-[15px] font-medium text-ap-ink hover:bg-ap-media nums"
                  >
                    {results.isFetchingNextPage ? "Loading…" : `Show ${Math.min(PAGE, remaining)} more`}
                  </a>
                </>
              ) : (
                <p className="text-[14px] text-ap-muted">
                  You've seen them all ·{" "}
                  <button
                    type="button"
                    onClick={() => {
                      window.scrollTo({
                        top: 0,
                        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                      });
                      input.current?.focus({ preventScroll: true });
                    }}
                    className="font-medium text-ap-blue"
                  >
                    Back to top ↑
                  </button>
                </p>
              )}
              {!hasMore && isAim && (
                <p className="aimante-list-link text-[14px] text-ap-muted">
                  <Link to="/aimante/join" className="font-medium text-ap-blue hover:underline">
                    Your brand here? List it free →
                  </Link>
                </p>
              )}
            </div>
          )}
        </section>
      </div>
      <ReelNavContext.Provider value={reelNav}>
      <ReelDetail card={open} onClose={closeReel} />
      <SiteReelModal
        reel={openSite}
        tags={
          found.find((r) => r.id === openSite?.id)?.moods ?? featuredSet.find((r) => r.id === openSite?.id)?.moods ?? []
        }
        onClose={closeReel}
      />
      </ReelNavContext.Provider>
    </SiteShell>
  );
}

function nextQuery(search: Record<string, unknown>, page: number) {
  const p = new URLSearchParams();
  for (const k of ["q", "mood", "category", "brand"]) {
    const v = search[k];
    if (typeof v === "string" && v) p.set(k, v);
  }
  p.set("page", String(page));
  return p.toString();
}

function SkeletonGrid({ n, className }: { n: number; className?: string }) {
  return (
    <ul
      aria-hidden
      className={cn(
        "dir-results-grid grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]",
        className,
      )}
    >
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
