import { ReelProductList } from "./ReelProducts";
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
const andJoin = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

/** Plays the current selection one reel at a time, large. */
export function StageView({ mood, family, start, data }: { mood: string | null; family: string | null; categories: string[]; start: string | null; data: StageData }) {
  const router = useRouter();
  const navigate = useNavigate();
  const { families } = useMoodCatalog();
  const list = data.reels;
  const [index, setIndex] = useState(() => Math.max(0, list.findIndex((r) => r.id === start)));
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const swipe = useRef<number | null>(null);
  const wordBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => { setIndex(Math.max(0, list.findIndex((r) => r.id === start))); }, [list, start]);
  useEffect(() => {
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  const reel = list[index];
  const total = list.length;
  const go = (i: number) => { if (i >= 0 && i < total) { setIndex(i); setProgress(0); setDuration(0); } };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mapOpen) return; // arrows belong to the mood map while it is open
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const paused = userPaused || hidden || mapOpen;
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused) v.pause(); else void v.play().catch(() => {});
  }, [paused, index]);

  const currentFamily = families.find((f) => mood ? f.moods.some((m) => m.toLowerCase() === mood) : family ? f.family.toLowerCase() === family : false);
  const fitSet = useMemo(() => {
    const ms = (currentFamily?.moods ?? []).map((m) => m.toLowerCase());
    return new Set(mood ? [mood, ...ms] : family ? ms : []);
  }, [mood, family, currentFamily]);
  const wash = currentFamily ? MOOD_FAMILY_COLORS[currentFamily.family as MoodFamily]?.bg : undefined;
  const word = mood ?? family ?? "anything";

  const details = (r: FacetedReel | undefined) => {
    if (!r) return null;
    if (r.kind === "directory") {
      const c = data.cards.find((x) => x.reel_id === r.id);
      return { tags: Array.from(new Set([...(c?.moods ?? r.moods), ...(c?.tags ?? [])])), href: c?.website_url ?? null, description: c?.description ?? null };
    }
    const s = data.siteReels.find((x) => x.id === r.id);
    return { tags: Array.from(new Set(r.moods)), href: s?.href ?? null, description: s?.description ?? null };
  };
  const d = details(reel);
  const fits = (d?.tags ?? []).filter((t) => fitSet.has(t.toLowerCase())).slice(0, 3);
  // Tags: mood-fitting ones first, at most 6 until expanded; resets per reel.
  const [tagsOpen, setTagsOpen] = useState(false);
  useEffect(() => setTagsOpen(false), [reel?.id]);
  const orderedTags = useMemo(() => [...(d?.tags ?? [])].sort((a, b) => Number(fitSet.has(b.toLowerCase())) - Number(fitSet.has(a.toLowerCase()))), [d, fitSet]);
  const shownTags = tagsOpen ? orderedTags : orderedTags.slice(0, 6);
  const tags = orderedTags.length > 0 && <ul className="flex flex-wrap items-center gap-1.5" aria-label="Tags">
    {shownTags.map((t) => <li key={t} className={cn("rounded-[4px] border px-2.5 py-0.5 text-[13px]", fitSet.has(t.toLowerCase()) ? "border-transparent bg-ap-soft-blue text-ap-blue" : "border-ap-hairline")}>{t}</li>)}
    {orderedTags.length > 6 && <li><button type="button" onClick={() => setTagsOpen((o) => !o)} className="px-1 text-[13px] text-ap-muted hover:text-ap-blue hover:underline">{tagsOpen ? "Show fewer" : `+ ${orderedTags.length - 6} more`}</button></li>}
  </ul>;
  const saveControl = reel && <span className="stage-save inline-flex items-center gap-1.5 text-[14px]">
    {reel.kind === "site" ? <SiteReelHeart inline reelId={reel.id} name={reel.title} /> : <DirectoryReelHeart inline reelId={reel.id} name={reel.title} />}
    Save
  </span>;
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
            <button ref={wordBtn} type="button" aria-haspopup="dialog" aria-expanded={mapOpen} onClick={() => setMapOpen(true)} className="text-ap-blue hover:underline">{word}</button>
            <span className="font-light text-ap-headline-bracket"> ]</span>
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
          {d?.description && <p className="mt-3 text-[15px] leading-relaxed text-ap-body">{d.description}</p>}
          <div className="stage-mobile-details mt-4">{tags}</div>
          {reel && <ReelProductList reelId={reel.id} className="mt-4" />}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {d?.href && <a href={d.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-ap-blue px-4 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover">Visit {reel.brand_name} <ArrowUpRight className="size-4" strokeWidth={1.7} /></a>}
            <div className="stage-mobile-details">{saveControl}</div>
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
              {src ? <video key={reel.id} ref={video} src={src} poster={reel.poster ?? undefined} muted playsInline autoPlay={!paused} loop
                aria-label={`${reel.brand_name} reel`}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => { const dd = e.currentTarget.duration; if (dd && isFinite(dd) && dd !== duration) setDuration(dd); setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0); }} />
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
          <div className="stage-reel-details min-w-0">
            {tags}
            <div className="mt-3">{saveControl}</div>
          </div>
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
      {mapOpen && <MoodMap families={families} current={mood} currentFamily={family} returnFocus={wordBtn} onClose={() => setMapOpen(false)} />}
    </main>
  </SiteShell>;
}

/** Full-screen mood map: one ring of family nodes around "How do you want to feel?". Stage view only. */
function MoodMap({ families, current, currentFamily, returnFocus, onClose }: {
  families: { family: string; moods: string[] }[];
  current: string | null;
  currentFamily: string | null;
  returnFocus: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const nameRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const isCurrent = (f: { family: string; moods: string[] }) =>
    current ? f.moods.some((m) => m.toLowerCase() === current) : currentFamily ? f.family.toLowerCase() === currentFamily : false;

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const at = Math.max(0, families.findIndex(isCurrent));
    nameRefs.current[at]?.focus();
    return () => { document.removeEventListener("keydown", key); returnFocus.current?.focus(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Choosing clears the categories filter and restarts from the first reel; the seed keeps the grid's order.
  const keepSeed = (prev: Record<string, unknown>) => ({ seed: prev["seed"] as string | undefined });

  return <div role="dialog" aria-modal="true" aria-label="Choose a mood" className="moodmap"
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <button type="button" onClick={onClose} className="moodmap-close">Close</button>
    <div className="moodmap-ring">
      <div className="moodmap-center">
        <p className="moodmap-question"><span className="text-ap-ink">How do you want</span><br /><span className="text-ap-headline-muted">to feel?</span></p>
        <Link to="/stage" search={keepSeed} onClick={onClose} className="mt-3 inline-block text-[14px] font-medium text-ap-blue hover:underline">Any mood</Link>
      </div>
      {families.map((f, i) => {
        const a = (-90 + (i * 360) / families.length) * (Math.PI / 180);
        const cur = isCurrent(f);
        const color = MOOD_FAMILY_COLORS[f.family as MoodFamily]?.bg ?? "var(--ap-muted)";
        return <div key={f.family} className={cn("moodmap-node", cur && "is-current")}
          style={{ left: `${50 + 50 * Math.cos(a)}%`, top: `${50 + 50 * Math.sin(a)}%` }}>
          <Link to="/stage" search={(prev) => ({ ...keepSeed(prev as Record<string, unknown>), family: f.family.toLowerCase() })} onClick={onClose}
            aria-label={`Play ${f.family} reels`} className="moodmap-dot mx-auto block" style={{ background: color }} />
          <Link to="/stage" search={(prev) => ({ ...keepSeed(prev as Record<string, unknown>), family: f.family.toLowerCase() })} onClick={onClose}
            ref={(el) => { nameRefs.current[i] = el; }}
            className={cn("moodmap-name mt-2 block font-semibold", cur ? "text-ap-blue" : "text-ap-ink")}>{f.family}</Link>
          <p className="moodmap-moods mt-0.5">
            {f.moods.map((m, j) => <span key={m}>
              {j > 0 && <span aria-hidden> · </span>}
              <Link to="/stage/$mood" params={{ mood: m.toLowerCase() }} search={keepSeed} onClick={onClose}
                className={cn("hover:text-ap-blue hover:underline", current === m.toLowerCase() && "text-ap-blue")}>{m}</Link>
            </span>)}
          </p>
        </div>;
      })}
    </div>
  </div>;
}
