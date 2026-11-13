import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { DirectoryReelHeart } from "@/components/directory/LikeSave";
import { SiteReelHeart } from "@/components/site/SiteReelHeart";
import { useMoodCatalog } from "@/lib/directory/moods";
import { MOOD_FAMILY_COLORS, type MoodFamily } from "@/lib/directory/mood-admin";
import type { FacetedReel } from "@/lib/directory/directory.functions";
import type { DirectoryCard } from "@/lib/directory/directory";
import type { SiteReel } from "@/lib/site/reels";
import { cn } from "@/lib/utils";

export type StageData = { reels: FacetedReel[]; cards: DirectoryCard[]; siteReels: SiteReel[] };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const andJoin = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

/** Plays the current selection one reel at a time, large. */
export function StageView({ mood, categories, start, data }: { mood: string | null; categories: string[]; start: string | null; data: StageData }) {
  const router = useRouter();
  const navigate = useNavigate();
  const { families } = useMoodCatalog();
  const list = data.reels;
  const [index, setIndex] = useState(() => Math.max(0, list.findIndex((r) => r.id === start)));
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [reduced, setReduced] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const swipe = useRef<number | null>(null);

  useEffect(() => { setIndex(Math.max(0, list.findIndex((r) => r.id === start))); }, [list, start]);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  const reel = list[index];
  const total = list.length;
  const go = (i: number) => { if (i >= 0 && i < total) { setIndex(i); setProgress(0); } };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const paused = userPaused || hidden || menuOpen;
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused) v.pause(); else void v.play().catch(() => {});
  }, [paused, index]);

  const family = families.find((f) => f.moods.some((m) => m.toLowerCase() === mood));
  const fitSet = useMemo(() => new Set(mood ? [mood, ...(family?.moods ?? []).map((m) => m.toLowerCase())] : []), [mood, family]);
  const wash = family ? MOOD_FAMILY_COLORS[family.family as MoodFamily]?.bg : undefined;

  const details = (r: FacetedReel | undefined) => {
    if (!r) return null;
    if (r.kind === "directory") {
      const c = data.cards.find((x) => x.reel_id === r.id);
      return { tags: Array.from(new Set([...(c?.moods ?? r.moods), ...(c?.tags ?? [])])), href: c?.website_url ?? null };
    }
    const s = data.siteReels.find((x) => x.id === r.id);
    return { tags: Array.from(new Set(r.moods)), href: s?.href ?? null };
  };
  const d = details(reel);
  const fits = (d?.tags ?? []).filter((t) => fitSet.has(t.toLowerCase())).slice(0, 3);
  const others = list.map((r, i) => ({ r, i })).filter((x) => x.i !== index).slice(0, 4);
  const src = reel?.video_url ?? reel?.preview_url ?? null;
  const back = () => { if (window.history.length > 1) router.history.back(); else void navigate({ to: "/directory" }); };

  return <SiteShell>
    <main className="stage font-ap text-ap-ink mx-auto max-w-[1180px] px-6 pt-8 pb-16">
      <button type="button" onClick={back} className="text-[15px] font-medium text-ap-blue hover:underline">← Directory</button>
      <header className="mt-4 text-center">
        <p className="text-[13px] font-semibold tracking-[0.06em] text-ap-muted uppercase">Stage view</p>
        <h1 className="stage-headline mt-2 font-semibold">
          <span className="text-ap-headline-muted">Show me something: </span>
          <span className="relative inline-block text-ap-blue">
            <span className="font-light text-ap-headline-bracket">[ </span>
            <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="text-ap-blue hover:underline">{mood ?? "anything"}</button>
            <span className="font-light text-ap-headline-bracket"> ]</span>
            {menuOpen && <MoodMenu families={families} current={mood} categories={categories} onClose={() => setMenuOpen(false)} />}
          </span>
        </h1>
        <p className="mt-3 text-[15px] text-ap-body nums">
          {total} {total === 1 ? "reel" : "reels"}.{reel && <> Leading with {reel.brand_name}{fits.length ? `: ${andJoin(fits)}` : ""}.</>}
        </p>
      </header>

      {!reel ? <p className="mt-16 text-center text-ap-body">No reels match this selection yet. <Link to="/directory" className="text-ap-blue hover:underline">Browse the Directory</Link></p> :
      <div className="stage-grid mt-10">
        <section className="stage-info" aria-label="About this reel">
          <p className="text-[14px] font-semibold text-ap-blue">{reel.category}</p>
          <h2 className="mt-2 text-[28px] leading-tight font-semibold">{reel.title}</h2>
          <p className="mt-1 text-[15px]">by <Link to="/directory/$slug" params={{ slug: reel.brand_slug }} className="font-semibold text-ap-blue hover:underline">{reel.brand_name}</Link></p>
          {d && d.tags.length > 0 && <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">{d.tags.map((t) => <li key={t} className={cn("rounded-[4px] border px-2.5 py-0.5 text-[13px]", fitSet.has(t.toLowerCase()) ? "border-transparent bg-ap-soft-blue text-ap-blue" : "border-ap-hairline")}>{t}</li>)}</ul>}
          <div className="mt-6 flex items-center gap-3">
            {d?.href && <a href={d.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-ap-blue px-4 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover">Visit {reel.brand_name} <ArrowUpRight className="size-4" strokeWidth={1.7} /></a>}
            <span className="stage-save inline-flex items-center gap-1.5 text-[14px]">
              {reel.kind === "site" ? <SiteReelHeart inline reelId={reel.id} name={reel.title} /> : <DirectoryReelHeart inline reelId={reel.id} name={reel.title} />}
              Save
            </span>
          </div>
        </section>

        <div className="stage-center" style={wash ? { ["--stage-wash" as string]: wash } : undefined}>
          <button type="button" aria-label="Previous reel" disabled={index === 0} onClick={() => go(index - 1)} className="reel-popup-step stage-step">
            <ChevronLeft className="size-5" strokeWidth={1.7} />
          </button>
          <div className="stage-frame"
            onPointerDown={(e) => { swipe.current = e.clientX; }}
            onPointerUp={(e) => { const s = swipe.current; swipe.current = null; if (s === null) return; const dx = e.clientX - s; if (dx > 50) go(index - 1); else if (dx < -50) go(index + 1); }}>
            <div className="stage-media">
              {src ? <video key={reel.id} ref={video} src={src} poster={reel.poster ?? undefined} muted playsInline autoPlay={!paused} loop={reduced}
                aria-label={`${reel.brand_name} reel`}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
                onEnded={() => { if (!reduced) go(index + 1 < total ? index + 1 : index); }} />
                : reel.poster ? <img src={reel.poster} alt={`${reel.brand_name} reel`} /> : null}
            </div>
            <div className="stage-controls">
              <button type="button" aria-label={userPaused ? "Play" : "Pause"} onClick={() => setUserPaused((p) => !p)} className="grid size-8 place-items-center">
                {userPaused ? <Play className="size-4" strokeWidth={1.7} /> : <Pause className="size-4" strokeWidth={1.7} />}
              </button>
              <div className="stage-progress" aria-hidden><span style={{ width: `${progress * 100}%` }} /></div>
              <span className="text-[13px] nums">{index + 1} / {total}{duration ? ` · ${duration.toFixed(1)} sec` : ""}</span>
            </div>
          </div>
          <button type="button" aria-label="Next reel" disabled={index >= total - 1} onClick={() => go(index + 1)} className="reel-popup-step stage-step">
            <ChevronRight className="size-5" strokeWidth={1.7} />
          </button>
        </div>

        <aside className="stage-also" aria-label="Also fits">
          <h2 className="text-[15px] font-semibold">Also fits</h2>
          <ul className="stage-also-list mt-3">
            {others.map(({ r, i }) => <li key={`${r.kind}-${r.id}`}>
              <button type="button" onClick={() => go(i)} className="flex w-full items-center gap-3 text-left">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden bg-ap-panel">{r.poster && <img src={r.poster} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />}</span>
                <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{r.title}</span><span className="block truncate text-[12px] text-ap-muted">{r.brand_name}</span></span>
              </button>
            </li>)}
          </ul>
        </aside>
      </div>}
    </main>
  </SiteShell>;
}

function MoodMenu({ families, current, categories, onClose }: { families: { family: string; moods: string[] }[]; current: string | null; categories: string[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [onClose]);
  const search = categories.length ? { categories: categories.join("|") } : {};
  return <div ref={ref} role="menu" aria-label="Mood" className="absolute top-full left-1/2 z-40 mt-3 max-h-[60vh] w-[min(560px,90vw)] -translate-x-1/2 overflow-y-auto rounded-[4px] border border-ap-hairline bg-ap-card p-4 text-left text-[14px] font-normal text-ap-ink shadow-ap-soft">
    <Link to="/stage" search={search} onClick={onClose} role="menuitem" className={cn("mb-3 inline-block hover:text-ap-blue", !current && "font-semibold text-ap-blue")}>Any mood</Link>
    {families.map((f) => <div key={f.family} className="mb-3">
      <p className="mb-1 text-[11px] font-semibold tracking-[.06em] text-ap-muted uppercase">{f.family}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {f.moods.map((m) => <Link key={m} to="/stage/$mood" params={{ mood: m.toLowerCase() }} search={search} onClick={onClose} role="menuitem" className={cn("hover:text-ap-blue", current === m.toLowerCase() && "font-semibold text-ap-blue")}>{cap(m)}</Link>)}
      </div>
    </div>)}
  </div>;
}
