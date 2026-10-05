import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { X } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { ReelVideo } from "@/components/site/ReelVideo";
import { DirectoryGrid, ReelDetail } from "@/components/directory/DirectoryGrid";
import { searchDirectory } from "@/lib/directory/directory.functions";
import type { DirectoryCard } from "@/lib/directory/directory";
import { listSiteReels } from "@/lib/site/reels.functions";
import { FORMAT_LABEL, type SiteReel } from "@/lib/site/reels";
import { siteHead } from "@/lib/site/seo";
import { cn } from "@/lib/utils";

const ROTATING = ["soothing", "energizing", "hopeful", "inspiring", "cozy", "luxurious", "playful"];
const STARTERS: { label: string; q: string; mood?: boolean }[] = [
  { label: "soothing", q: "soothing", mood: true }, { label: "energizing", q: "energizing", mood: true }, { label: "cozy", q: "cozy", mood: true }, { label: "luxurious", q: "luxurious", mood: true },
  { label: "coffee", q: "coffee" }, { label: "wine", q: "wine" }, { label: "jewelry", q: "jewelry" }, { label: "holiday gifts", q: "holiday gifts" },
  { label: "square reels", q: "square" }, { label: "vertical for TikTok", q: "tiktok" },
];
const SIZES = [{ v: undefined, l: "All" }, { v: "9x16", l: "9:16" }, { v: "1x1", l: "1:1" }, { v: "16x9", l: "16:9" }] as const;

export const Route = createFileRoute("/directory/")({
  validateSearch: z.object({ q: z.string().optional(), size: z.string().optional() }),
  loaderDeps: ({ search }) => ({ q: (search.q ?? "").slice(0, 200), size: search.size }),
  loader: async ({ deps }) => {
    const size = deps.size === "9x16" || deps.size === "1x1" || deps.size === "16x9" ? deps.size : null;
    const [cards, reels, fallback] = await Promise.all([
      searchDirectory({ data: { q: deps.q, size } }).catch(() => [] as DirectoryCard[]),
      deps.q ? Promise.resolve([] as SiteReel[]) : listSiteReels().catch(() => [] as SiteReel[]),
      deps.q ? searchDirectory({ data: { q: "", size: null } }).catch(() => [] as DirectoryCard[]) : Promise.resolve([] as DirectoryCard[]),
    ]);
    return { q: deps.q, cards, reels, fallback };
  },
  head: ({ loaderData }) => {
    const base = siteHead({
      path: "/directory",
      title: loaderData?.q ? `“${loaderData.q}” video ads — Gravity Pants Directory` : "Gravity Pants Directory — Video ad ideas by mood and brand",
      description: "Search real video ads and Reels made with Gravity Pants by mood, product or brand, and start your own from the same template.",
    });
    // The Directory isn't part of the marketing site yet — keep all pages out of search results.
    return { ...base, meta: [...(base.meta ?? []).filter((m: any) => m?.name !== "robots"), { name: "robots", content: "noindex, follow" }] }; // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  errorComponent: () => <SiteShell><p className="py-20 text-center">The Directory couldn't load. Try again.</p></SiteShell>,
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
  const { q, cards, reels, fallback } = Route.useLoaderData();
  const { size } = Route.useSearch();
  const navigate = useNavigate({ from: "/directory/" });
  const [value, setValue] = useState(q);
  const [open, setOpen] = useState<DirectoryCard | null>(null);
  const { day, mood } = useWeekdayMood();
  useEffect(() => setValue(q), [q]);
  const go = (v: string) => void navigate({ search: { q: v.trim() || undefined } });
  const also = useMemo(() => {
    const words = new Set(q.toLowerCase().split(/\s+/));
    const counts = new Map<string, number>();
    for (const c of cards.slice(0, 10)) for (const t of [...c.moods, ...c.tags]) if (!words.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }, [cards, q]);

  return (
    <SiteShell>
      <main className="font-ap text-ap-ink">
        <section className="mx-auto max-w-[900px] px-6 pt-20 pb-10 text-center">
          <p className="mb-3.5 text-[15px] font-semibold text-ap-badge">Directory</p>
          <h1 className="mb-8 text-[clamp(30px,5vw,56px)] leading-[1.08] font-semibold tracking-[-0.035em] text-[#a1a1a6]">
            <b className="font-semibold text-ap-ink">It's {day}.</b><br />Show me something:{" "}
            <span className="text-ap-blue" aria-live="polite">
              <span className="font-light text-[#c7c7cc]">[ </span>
              <span key={mood} className="inline-block animate-[dir-mood_.3s_ease]">{mood}</span>
              <span className="font-light text-[#c7c7cc]"> ]</span>
            </span>
          </h1>
          <form role="search" onSubmit={(e) => { e.preventDefault(); go(value); }} className="mx-auto flex h-[60px] max-w-[680px] items-center gap-2.5 rounded-[12px] border border-transparent bg-ap-panel pr-2 pl-5 transition-[background,border-color,box-shadow] focus-within:border-ap-hairline focus-within:bg-ap-card focus-within:shadow-[0_10px_30px_rgba(20,30,50,.10)]">
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Try: cozy knitwear, square, TikTok" aria-label="Search the Directory" className="h-full min-w-0 flex-1 bg-transparent text-[19px] outline-hidden placeholder:text-[#8e8e93]" />
            {value && <button type="button" aria-label="Clear search" onClick={() => { setValue(""); go(""); }} className="grid size-8 place-items-center text-ap-muted"><X className="size-4" strokeWidth={1.7} /></button>}
            <button type="submit" className="h-11 rounded-lg bg-ap-blue px-5 text-[16px] text-ap-card hover:bg-ap-blue-hover">Search</button>
          </form>
          <div className="mx-auto mt-[18px] flex max-w-[760px] flex-wrap justify-center gap-2">
            {STARTERS.map((s) => (
              <button key={s.label} type="button" onClick={() => go(s.q)} className={cn("rounded-lg bg-ap-panel px-3.5 py-2 text-[14px] hover:bg-ap-media", s.mood && "font-medium text-ap-badge")}>{s.label}</button>
            ))}
          </div>
        </section>

        {!q ? (
          <>
            {reels.length > 0 && (
              <section className="home-examples !min-h-0 !gap-8 py-14">
                <p className="mx-auto w-full max-w-[1280px] px-6 text-[15px] font-semibold text-ap-badge">Made with Gravity Pants</p>
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
            <section className="mx-auto max-w-[1280px] px-6 py-14">
              <h2 className="mb-5 text-[24px] font-semibold tracking-[-0.02em]">Browse the directory</h2>
              {cards.length ? <DirectoryGrid cards={cards} onOpen={setOpen} /> : <p className="text-ap-muted">The first reels are on their way.</p>}
            </section>
          </>
        ) : cards.length === 0 ? (
          <section className="mx-auto max-w-[1280px] px-6 pb-16 text-center">
            <h2 className="text-[24px] font-semibold">Nothing for “{q}” yet.</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {STARTERS.slice(0, 6).map((s) => <button key={s.label} type="button" onClick={() => go(s.q)} className="rounded-lg bg-ap-panel px-3 py-1.5 text-[14px]">{s.label}</button>)}
            </div>
            {fallback.length > 0 && (
              <div className="mt-12 text-left">
                <h3 className="mb-5 text-[20px] font-semibold">You might like these</h3>
                <DirectoryGrid cards={fallback.slice(0, 12)} onOpen={setOpen} />
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-6 pb-8">
              <p className="text-[17px] font-semibold nums">{cards.length} {cards.length === 1 ? "reel" : "reels"} for “{q}”</p>
              <div className="flex rounded-lg bg-ap-panel p-1" role="group" aria-label="Size">
                {SIZES.map((s) => (
                  <button key={s.l} type="button" aria-pressed={size === s.v} onClick={() => void navigate({ search: (p) => ({ ...p, size: s.v }) })} className={cn("h-8 rounded-md px-3 text-[13px] font-medium nums", size === s.v ? "bg-ap-card font-semibold shadow-ap-soft" : "text-ap-body")}>{s.l}</button>
                ))}
              </div>
              {also.length > 0 && (
                <p className="text-[14px] text-ap-muted">Also try: {also.map((t, i) => <span key={t}>{i > 0 && " · "}<Link to="/directory" search={{ q: t }} className="text-ap-blue">{t}</Link></span>)}</p>
              )}
            </section>
            <section className="mx-auto max-w-[1280px] px-6 py-12">
              <DirectoryGrid cards={cards} q={q} onOpen={setOpen} />
            </section>
          </>
        )}
      </main>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
    </SiteShell>
  );
}
