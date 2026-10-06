import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { ReelVideo } from "@/components/site/ReelVideo";
import { DirectoryGrid, ReelDetail } from "@/components/directory/DirectoryGrid";
import { listPublicBrands, searchDirectory } from "@/lib/directory/directory.functions";
import { CATEGORIES, categorySlug, type DirectoryCard } from "@/lib/directory/directory";
import { listSiteReels } from "@/lib/site/reels.functions";
import { FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { cn } from "@/lib/utils";
import { SiteReelHeart } from "@/components/site/SiteReelHeart";
import { SiteReelModal } from "@/components/site/SiteReelModal";
import { useMoodCatalog } from "@/lib/directory/moods";
import { matchesMood } from "@/lib/directory/mood-filter";
import { supabase } from "@/integrations/supabase/client";

const POSTER =
  "absolute top-1/2 left-1/2 h-[72%] w-auto max-w-[72%] object-contain -translate-x-1/2 -translate-y-1/2 rounded-[6px] shadow-[0_0_0_1px_var(--ap-inner),0_18px_34px_-16px_rgba(29,29,31,.28)]";

const ROTATING = ["soothing", "energizing", "hopeful", "inspiring", "cozy", "luxurious", "playful"];
const STARTERS: { label: string; q: string; mood?: boolean }[] = [
  { label: "soothing", q: "soothing", mood: true },
  { label: "energizing", q: "energizing", mood: true },
  { label: "cozy", q: "cozy", mood: true },
  { label: "luxurious", q: "luxurious", mood: true },
  { label: "coffee", q: "coffee" },
  { label: "wine", q: "wine" },
  { label: "jewelry", q: "jewelry" },
  { label: "holiday gifts", q: "holiday gifts" },
  { label: "square reels", q: "square" },
  { label: "vertical for TikTok", q: "tiktok" },
];
const SIZES = [
  { v: undefined, l: "All" },
  { v: "9x16", l: "9:16" },
  { v: "1x1", l: "1:1" },
  { v: "16x9", l: "16:9" },
] as const;

export const Route = createFileRoute("/directory/")({
  validateSearch: z.object({ q: z.string().optional(), size: z.string().optional(), mood: z.string().optional() }),
  loaderDeps: ({ search }) => ({ q: (search.q ?? "").slice(0, 200), size: search.size }),
  loader: async ({ deps }) => {
    const size = deps.size === "9x16" || deps.size === "1x1" || deps.size === "16x9" ? deps.size : null;
    const [cards, reels, fallback, brands] = await Promise.all([
      searchDirectory({ data: { q: deps.q, size } }).catch(() => [] as DirectoryCard[]),
      deps.q ? Promise.resolve([] as SiteReel[]) : listSiteReels().catch(() => [] as SiteReel[]),
      deps.q
        ? searchDirectory({ data: { q: "", size: null } }).catch(() => [] as DirectoryCard[])
        : Promise.resolve([] as DirectoryCard[]),
      deps.q ? Promise.resolve([]) : listPublicBrands().catch(() => []),
    ]);
    return { q: deps.q, cards, reels, fallback, brands };
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

function DirectoryPage() {
  const { q, cards: allCards, reels, fallback, brands: allBrands } = Route.useLoaderData();
  const { size, mood: selectedMood } = Route.useSearch();
  const { families, isLoading: moodsLoading } = useMoodCatalog();
  const { data: brandMoodRows = [], isLoading: brandMoodsLoading } = useQuery({
    queryKey: ["directory-brand-moods"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("directory_brands").select("slug, moods");
      if (error) throw error;
      return data ?? [];
    },
  });
  const brandMoods = new Map(brandMoodRows.map((b) => [b.slug, b.moods]));
  const cards = allCards.filter((c) => matchesMood(selectedMood, c.moods, brandMoods.get(c.brand_slug)));
  const brands = allBrands.filter((b) => matchesMood(selectedMood, [], brandMoods.get(b.slug)));
  const navigate = useNavigate({ from: "/directory/" });
  const [value, setValue] = useState(q);
  const [open, setOpen] = useState<DirectoryCard | null>(null);
  const [openSite, setOpenSite] = useState<SiteReel | null>(null);
  const brandReels = reels.filter((r) => r.brandSlug && matchesMood(selectedMood, [], brandMoods.get(r.brandSlug)));
  const { day, mood } = useWeekdayMood();
  useEffect(() => setValue(q), [q]);
  const go = (v: string) => void navigate({ search: (prev) => ({ ...prev, q: v.trim() || undefined }) });
  const also = useMemo(() => {
    const words = new Set(q.toLowerCase().split(/\s+/));
    const counts = new Map<string, number>();
    for (const c of cards.slice(0, 10))
      for (const t of [...c.moods, ...c.tags]) if (!words.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);
  }, [cards, q]);

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
          <div className="mx-auto mt-5 flex max-w-[680px] items-center justify-center gap-3 text-[14px]">
            <label htmlFor="directory-mood" className="font-semibold">Moods</label>
            <select
              id="directory-mood"
              value={selectedMood ?? ""}
              disabled={moodsLoading || brandMoodsLoading}
              onChange={(e) => void navigate({ search: (prev) => ({ ...prev, mood: e.target.value || undefined }) })}
              className="h-11 min-w-0 max-w-full rounded-lg border border-ap-hairline bg-ap-card px-3 text-ap-ink focus-visible:outline-2 focus-visible:outline-ap-blue disabled:opacity-50"
            >
              <option value="">All moods</option>
              {selectedMood && !families.some((f) => f.moods.includes(selectedMood)) && <option value={selectedMood}>{selectedMood}</option>}
              {families.map((f) => (
                <optgroup key={f.family} label={f.family}>
                  {[...f.moods].sort((a, b) => a.localeCompare(b)).map((name) => (
                    <option key={name} value={name}>{name.charAt(0).toUpperCase() + name.slice(1)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {/* Starter mood/tag chips hidden for now — bring back by re-enabling this block. */}
          {false && (
            <div className="mx-auto mt-[18px] flex max-w-[760px] flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => go(s.q)}
                  className={cn(
                    "rounded-lg bg-ap-panel px-3.5 py-2 text-[14px] hover:bg-ap-media",
                    s.mood && "font-medium text-ap-badge",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </section>

        {!q ? (
          <>
            {!selectedMood && reels.length > 0 && (
              <section className="home-examples dir-carousel !min-h-0 !gap-8 !py-14">
                <ReelCarousel
                  label="Reels made with Gravity Pants"
                  items={reels.map((r) => ({
                    key: r.id,
                    media: () => (
                      <div className={`home-example-video home-example-video-${r.format}`}>
                        <ReelVideo
                          video={r.video}
                          videoWebm={r.videoWebm ?? undefined}
                          poster={r.poster ?? undefined}
                          label={`${r.title} video ad`}
                        />
                      </div>
                    ),
                    title: r.title,
                    detail: `${r.photos} photos · ${r.seconds} sec · ${FORMAT_LABEL[r.format]} · ${r.brand}`,
                    visit: r.href ? { href: r.href, label: `Visit ${r.brand}` } : undefined,
                  }))}
                />
              </section>
            )}
            <section className="mx-auto max-w-[1280px] px-6 pt-14">
              <h2 className="mb-5 text-[24px] font-semibold tracking-[-0.02em]">Categories</h2>
              <ul className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <li key={c}>
                    <Link to="/directory/category/$slug" params={{ slug: categorySlug(c) }} className="inline-block rounded-lg bg-ap-panel px-3.5 py-2 text-[14px] hover:bg-ap-media">
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            {brands.length > 0 && (
              <section className="mx-auto max-w-[1280px] px-6 pt-14">
                <h2 className="mb-5 text-[24px] font-semibold tracking-[-0.02em]">Brands</h2>
                <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                  {brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        to="/directory/$slug"
                        params={{ slug: b.slug }}
                        className="flex items-center gap-3 rounded-lg bg-ap-panel p-3 hover:bg-ap-media"
                      >
                        {b.logo_url?.startsWith("https://") ? (
                          <img
                            src={b.logo_url}
                            alt=""
                            className="size-12 shrink-0 rounded-sm border border-ap-hairline bg-ap-card object-contain"
                          />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-sm border border-ap-hairline bg-ap-card text-[16px] font-semibold">
                            {b.name
                              .split(/\s+/)
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold">{b.name}</span>
                          <span className="block truncate text-[13px] text-ap-muted">{b.category}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="mx-auto max-w-[1280px] px-6 py-14">
              <h2 className="mb-5 text-[24px] font-semibold tracking-[-0.02em]">Browse the directory</h2>
              {cards.length > 0 && <DirectoryGrid cards={cards} onOpen={setOpen} />}
              {brandReels.length > 0 && (
                <ul
                  className={`grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] ${cards.length ? "mt-5" : ""}`}
                >
                  {brandReels.map((r) => (
                    <li key={r.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenSite(r)}
                        aria-label={`Open ${r.title}`}
                        className="relative block aspect-square w-full overflow-hidden rounded-[8px] bg-ap-panel"
                      >
                        {r.poster && <img src={r.poster} alt="" loading="lazy" className={POSTER} />}
                      </button>
                      <SiteReelHeart reelId={r.id} name={r.title} />
                      <p className="mt-2.5 truncate text-[14px] font-semibold">{r.title}</p>
                      <p className="truncate text-[12px] text-ap-muted nums">
                        {r.brand} · {r.seconds} sec
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {cards.length === 0 && brandReels.length === 0 && (
                <p className="text-ap-muted" role="status">{selectedMood ? `No reels tagged “${selectedMood}” yet.` : "The first reels are on their way."}</p>
              )}
            </section>
          </>
        ) : cards.length === 0 ? (
          <section className="mx-auto max-w-[1280px] px-6 pb-16 text-center">
            <h2 className="text-[24px] font-semibold">Nothing for “{q}”{selectedMood ? ` with the mood “${selectedMood}”` : ""} yet.</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {STARTERS.slice(0, 6).map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => go(s.q)}
                  className="rounded-lg bg-ap-panel px-3 py-1.5 text-[14px]"
                >
                  {s.label}
                </button>
              ))}
            </div>
            {!selectedMood && fallback.length > 0 && (
              <div className="mt-12 text-left">
                <h3 className="mb-5 text-[20px] font-semibold">You might like these</h3>
                <DirectoryGrid cards={fallback.slice(0, 12)} onOpen={setOpen} />
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-6 pb-8">
              <p className="text-[17px] font-semibold nums">
                {cards.length} {cards.length === 1 ? "reel" : "reels"} for “{q}”
              </p>
              <div className="flex rounded-lg bg-ap-panel p-1" role="group" aria-label="Size">
                {SIZES.map((s) => (
                  <button
                    key={s.l}
                    type="button"
                    aria-pressed={size === s.v}
                    onClick={() => void navigate({ search: (p) => ({ ...p, size: s.v }) })}
                    className={cn(
                      "h-8 rounded-md px-3 text-[13px] font-medium nums",
                      size === s.v ? "bg-ap-card font-semibold shadow-ap-soft" : "text-ap-body",
                    )}
                  >
                    {s.l}
                  </button>
                ))}
              </div>
              {also.length > 0 && (
                <p className="text-[14px] text-ap-muted">
                  Also try:{" "}
                  {also.map((t, i) => (
                    <span key={t}>
                      {i > 0 && " · "}
                      <Link to="/directory" search={{ q: t }} className="text-ap-blue">
                        {t}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </section>
            <section className="mx-auto max-w-[1280px] px-6 py-12">
              <DirectoryGrid cards={cards} q={q} onOpen={setOpen} />
            </section>
          </>
        )}
      </main>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
      <SiteReelModal reel={openSite} onClose={() => setOpenSite(null)} />
    </SiteShell>
  );
}
