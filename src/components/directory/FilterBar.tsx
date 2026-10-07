import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, categorySlug } from "@/lib/directory/directory";
import { MOOD_FAMILY_COLORS, type MoodFamily } from "@/lib/directory/mood-admin";
import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/lib/directory/categories.functions";

export type Facets = { moods: Record<string, number>; categories: Record<string, number>; brands: Record<string, number> };
export type FilterValue = { moods: string[]; categories: string[]; brands: string[] };
type Family = { family: string; moods: string[] };
type Brand = { slug: string; name: string; category: string; logo_url: string | null };
type Seg = "mood" | "category" | "brand";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const famColor = (f?: string) => (f ? MOOD_FAMILY_COLORS[f as MoodFamily] : undefined);
const summary = (names: string[]) => (names.length >= 3 ? `${names[0]} +${names.length - 1}` : names.join(", "));
const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function useNarrow() {
  const [n, setN] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 639px)");
    const f = () => setN(m.matches);
    f(); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return n;
}

/** Highlights the search match inside a label. */
function Mark({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-[2px] bg-ap-soft-blue text-inherit">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export function FilterBar({ value, onChange, facets, total, families, brands, compact = false, comingSoon = true }: {
  compact?: boolean; comingSoon?: boolean; value: FilterValue; onChange: (v: FilterValue) => void; facets: Facets; total: number; families: Family[]; brands: Brand[];
}) {
  const [open, setOpen] = useState<Seg | null>(null);
  const [hover, setHover] = useState<Seg | null>(null);
  const narrow = useNarrow();
  const wrap = useRef<HTMLDivElement>(null);
  const segRefs = { mood: useRef<HTMLButtonElement>(null), category: useRef<HTMLButtonElement>(null), brand: useRef<HTMLButtonElement>(null) };
  const familyOf = new Map(families.flatMap((f) => f.moods.map((m) => [m, f.family] as const)));

  const close = (focus = true) => { const s = open; setOpen(null); if (focus && s) segRefs[s].current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
    const down = (e: MouseEvent) => { if (!narrow && wrap.current && !wrap.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", down);
    if (narrow) document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("mousedown", down); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, narrow]);

  const catName = (s: string) => CATEGORIES.find((c) => categorySlug(c) === s) ?? s;
  const brandName = (s: string) => brands.find((b) => b.slug === s)?.name ?? s;
  const segs: { id: Seg; label: string; empty: string; names: string[]; key: keyof FilterValue }[] = [
    { id: "mood", label: "Mood", empty: "Any mood", names: value.moods.map(cap), key: "moods" },
    { id: "category", label: "Category", empty: "Any category", names: value.categories.map(catName), key: "categories" },
    { id: "brand", label: "Brand", empty: "Any brand", names: value.brands.map(brandName), key: "brands" },
  ];
  const set = (k: keyof FilterValue, list: string[]) => onChange({ ...value, [k]: list });

  const footer = (k: keyof FilterValue) => (
    <div className="flex items-center justify-between gap-3 border-t border-ap-hairline px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <button type="button" disabled={!value[k].length} onClick={() => set(k, [])} className="text-[14px] font-medium text-ap-blue disabled:text-ap-muted disabled:opacity-60 nums">
        Clear ({value[k].length})
      </button>
      <button type="button" onClick={() => close()} className={cn("h-10 rounded-lg bg-ap-ink px-4 text-[14px] font-medium text-ap-card nums", narrow && "flex-1")}>
        {total === 0 ? "No matches" : `Show ${total} ${total === 1 ? "reel" : "reels"}`}
      </button>
    </div>
  );

  const panel = (seg: Seg, title: string, hint: string, body: ReactNode, k: keyof FilterValue) => {
    const width = seg === "mood" ? 620 : seg === "category" ? 540 : 400;
    const inner = (
      <div role="dialog" aria-modal={narrow} aria-label={`${title} filter`} id={`dir-panel-${seg}`}
        className={cn("flex flex-col bg-ap-card text-left shadow-[var(--ap-shadow-menu)]",
          narrow ? "fixed inset-x-0 bottom-0 z-50 max-h-[82vh] rounded-t-[20px]" : "absolute top-[calc(100%+8px)] z-40 max-h-[560px] max-w-[calc(100vw-32px)] rounded-[18px]",
          !narrow && (seg === "mood" ? "left-0" : seg === "brand" ? "right-0" : "left-1/2 -translate-x-1/2"))}
        style={narrow ? undefined : { width }}>
        {narrow && <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-ap-switch-off" />}
        <div className="px-5 pt-4 pb-3">
          <h2 className="text-[17px] font-semibold text-ap-ink">{title}</h2>
          <p className="text-[13px] text-ap-muted">{hint}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{body}</div>
        {footer(k)}
      </div>
    );
    return narrow ? (
      <>
        <div aria-hidden className="fixed inset-0 z-50 bg-ap-ink/40" onClick={() => close()} />
        {inner}
      </>
    ) : inner;
  };

  return (
    <div ref={wrap} className="relative mx-auto max-w-[680px]">
      <div className={cn("grid transition-[height] motion-reduce:transition-none", compact ? "h-[52px]" : "h-[60px]")}>
      <div className="grid h-full grid-cols-[1.15fr_1fr_1fr] rounded-[14px] bg-ap-panel p-1" role="group" aria-label="Filter reels">
        {segs.map((s, i) => {
          const active = s.names.length > 0;
          const isOpen = open === s.id;
          const prev = segs[i - 1]?.id;
          const hideDivider = i === 0 || [s.id, prev].some((x) => x === hover || x === open);
          return (
            <div key={s.id} className="relative min-w-0">
              {!hideDivider && <span aria-hidden className="absolute top-3 bottom-3 left-0 w-px bg-ap-hairline" />}
              <button ref={segRefs[s.id]} type="button" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={`dir-panel-${s.id}`}
                aria-label={`${s.label}: ${active ? s.names.join(", ") : s.empty}`}
                onClick={() => setOpen(isOpen ? null : s.id)}
                onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
                className={cn("flex h-full w-full items-center gap-2 rounded-[10px] px-2.5 text-left transition-[background,box-shadow] motion-reduce:transition-none sm:px-4 focus-visible:outline-2 focus-visible:outline-ap-blue",
                  isOpen ? "bg-ap-card shadow-ap-soft" : "hover:bg-ap-segment-hover", active && "pr-9 sm:pr-10")}>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[10.5px] font-semibold tracking-[.06em] uppercase", active ? "text-ap-blue-strong" : "text-ap-muted")}>{s.label}</span>
                  <span className={cn("flex items-center gap-1.5 text-[15px]", active ? "font-medium text-ap-ink" : "text-ap-muted")}>
                    {s.id === "mood" && active && (
                      <span aria-hidden className="hidden shrink-0 -space-x-1 sm:flex">
                        {value.moods.slice(0, 3).map((m) => <span key={m} className="size-2.5 rounded-full ring-2 ring-ap-panel" style={{ background: famColor(familyOf.get(m))?.bg }} />)}
                      </span>
                    )}
                    <span className="truncate">{active ? summary(s.names) : s.empty}</span>
                  </span>
                </span>
                {!active && <ChevronDown aria-hidden className={cn("hidden size-4 shrink-0 text-ap-muted transition-transform motion-reduce:transition-none sm:block", isOpen && "rotate-180")} strokeWidth={1.7} />}
              </button>
              {active && (
                <button type="button" aria-label={`Clear ${s.label.toLowerCase()} filter`} onClick={() => set(s.key, [])}
                  className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-ap-media text-ap-ink hover:bg-ap-switch-off sm:right-3">
                  <X className="size-3.5" strokeWidth={1.7} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      </div>
      {open === "mood" && panel("mood", "Mood", "Pick the feelings you're after. Tap a family to pick all of it.",
        <MoodBody families={families} selected={value.moods} counts={facets.moods} onChange={(m) => set("moods", m)} />, "moods")}
      {open === "category" && panel("category", "Category", "What the brand sells.",
        <CategoryBody comingSoon={comingSoon} selected={value.categories} counts={facets.categories} narrow={narrow} onChange={(c) => set("categories", c)} />, "categories")}
      {open === "brand" && panel("brand", "Brand", "See reels from specific brands.",
        <BrandBody brands={brands} selected={value.brands} counts={facets.brands} onChange={(b) => set("brands", b)} />, "brands")}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="sticky top-0 z-10 mb-3 flex h-10 items-center gap-2 rounded-lg bg-ap-panel px-3">
      <Search aria-hidden className="size-4 text-ap-muted" strokeWidth={1.7} />
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder.replace("…", "")}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ap-ink outline-hidden placeholder:text-ap-muted" />
    </label>
  );
}

function MoodBody({ families, selected, counts, onChange }: { families: Family[]; selected: string[]; counts: Record<string, number>; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const total = families.reduce((n, f) => n + f.moods.length, 0);
  const rows = families.map((f) => ({ ...f, shown: f.moods.filter((m) => m.includes(q.toLowerCase())) })).filter((f) => f.shown.length);
  return (
    <>
      <SearchBox value={q} onChange={setQ} placeholder={`Search ${total} moods…`} />
      {rows.length === 0 && <p className="py-6 text-center text-[14px] text-ap-muted">No moods match “{q}”.</p>}
      <div className="grid gap-3">
        {rows.map((f) => {
          const c = famColor(f.family);
          const all = f.moods.every((m) => selected.includes(m));
          return (
            <div key={f.family} className="grid gap-2 sm:grid-cols-[120px_1fr]">
              <button type="button" aria-pressed={all} aria-label={`${all ? "Deselect" : "Select"} all ${f.family} moods`}
                onClick={() => onChange(all ? selected.filter((m) => !f.moods.includes(m)) : [...new Set([...selected, ...f.moods])])}
                className="group flex h-8 items-center gap-2 self-start text-[14px] font-semibold text-ap-ink">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: c?.bg }} />
                {f.family}
                <span className="text-[12px] font-normal text-ap-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{all ? "none" : "all"}</span>
              </button>
              <div className="flex flex-wrap gap-1.5">
                {f.shown.map((m) => {
                  const on = selected.includes(m);
                  const n = counts[m] ?? 0;
                  return (
                    <button key={m} type="button" aria-pressed={on} aria-label={`${cap(m)}, ${n} ${n === 1 ? "reel" : "reels"}`} onClick={() => onChange(toggleIn(selected, m))}
                      className={cn("inline-flex h-8 items-center gap-1 rounded-full px-3 text-[14px] transition-[background,box-shadow]",
                        on ? (c?.ink === "dark" ? "text-ap-ink" : "text-ap-card") : "bg-ap-panel text-ap-ink hover:bg-ap-media", !on && n === 0 && "opacity-45")}
                      style={on ? { background: c?.bg, boxShadow: `0 4px 14px -4px ${c?.bg}` } : undefined}>
                      {on && <Check aria-hidden className="size-3.5" strokeWidth={2} />}
                      <Mark text={cap(m)} q={q} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CategoryBody({ selected, counts, narrow, onChange, comingSoon }: { comingSoon: boolean; selected: string[]; counts: Record<string, number>; narrow: boolean; onChange: (v: string[]) => void }) {
  const catalog = useQuery({ queryKey: ["category-catalog"], queryFn: () => listCategories(), staleTime: 30_000 });
  const hints = new Map((catalog.data ?? []).map((c) => [c.name, c.hint]));
  const list = CATEGORIES.map((c) => ({ name: c, slug: categorySlug(c), n: counts[categorySlug(c)] ?? 0 }));
  const groups = [
    { title: "With reels", items: list.filter((c) => c.n > 0 || selected.includes(c.slug)) },
    { title: "Coming soon", items: comingSoon ? list.filter((c) => c.n === 0 && !selected.includes(c.slug)) : [] },
  ].filter((g) => g.items.length);
  return (
    <div className="grid gap-4">
      {groups.map((g) => (
        <fieldset key={g.title}>
          <legend className="mb-1.5 text-[11px] font-semibold tracking-[.06em] text-ap-muted uppercase">{g.title}</legend>
          <div className={cn("grid gap-x-4", !narrow && "grid-cols-2")}>
            {g.items.map((c) => (
              <label key={c.slug} className={cn("flex min-h-12 cursor-pointer items-center gap-2.5 rounded-sm py-2 text-[14px]", g.title === "Coming soon" && "text-ap-muted")}>
                <input type="checkbox" checked={selected.includes(c.slug)} onChange={() => onChange(toggleIn(selected, c.slug))} className="size-4 accent-ap-blue" />
                <span className="min-w-0 flex-1"><span className="block break-words">{c.name}</span>{hints.get(c.name) && <span className="block text-[12px] leading-4 text-ap-muted">{hints.get(c.name)}</span>}</span>
                <span className="text-[13px] text-ap-muted nums">{c.n}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function BrandBody({ brands, selected, counts, onChange }: { brands: Brand[]; selected: string[]; counts: Record<string, number>; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const t = q.toLowerCase();
  const shown = brands.filter((b) => b.name.toLowerCase().includes(t) || b.category.toLowerCase().includes(t));
  return (
    <>
      <SearchBox value={q} onChange={setQ} placeholder="Search brands…" />
      {shown.length === 0 && <p className="py-6 text-center text-[14px] text-ap-muted">No brands match “{q}”.</p>}
      <ul className="grid gap-1">
        {shown.map((b) => {
          const on = selected.includes(b.slug);
          const n = counts[b.slug] ?? 0;
          return (
            <li key={b.slug}>
              <button type="button" aria-pressed={on} onClick={() => onChange(toggleIn(selected, b.slug))}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-ap-panel">
                {b.logo_url?.startsWith("https://") ? (
                  <img src={b.logo_url} alt="" className={cn("size-10 shrink-0 rounded-sm border border-ap-hairline bg-ap-card object-contain", on && "ring-2 ring-ap-blue")} />
                ) : (
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-sm border border-ap-hairline bg-ap-card text-[14px] font-semibold", on && "ring-2 ring-ap-blue")}>
                    {b.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ap-ink"><Mark text={b.name} q={q} /></span>
                  <span className="block truncate text-[12px] text-ap-muted">{b.category}</span>
                </span>
                <span className="text-[13px] text-ap-muted nums">{n}</span>
                <Check aria-hidden className={cn("size-4 text-ap-blue", !on && "invisible")} strokeWidth={2} />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
