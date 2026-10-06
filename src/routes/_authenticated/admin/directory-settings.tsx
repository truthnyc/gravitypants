import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, PageTitle } from "@/components/admin/AdminShell";
import { FeaturedBand } from "@/components/directory/FeaturedBand";
import { getDirectorySettingsAdmin, saveDirectorySettings } from "@/lib/directory/settings.functions";
import { listPublicBrands, searchDirectory, type FacetedReel } from "@/lib/directory/directory.functions";
import { listSiteReels } from "@/lib/site/reels.functions";
import { CATEGORIES, categorySlug } from "@/lib/directory/directory";
import { useMoodCatalog } from "@/lib/directory/moods";
import {
  DEFAULT_DIRECTORY_SETTINGS, MIN_MANUAL_PICKS, SPEED_SECONDS, mondayOf, resolveFeatured, type DirectorySettings, type FeaturedPick,
} from "@/lib/directory/settings";
import { cn } from "@/lib/utils";
import { HeadlineCard, greetingErrors } from "@/components/admin/HeadlineCard";
import { getGreetingAdmin, saveGreetingConfig } from "@/lib/directory/greeting.functions";
import { DEFAULT_GREETING, type GreetingConfig } from "@/lib/directory/greeting";
import { getDirectoryWeeklyViews } from "@/lib/directory/views.functions";

export const Route = createFileRoute("/_authenticated/admin/directory-settings")({
  head: () => ({ meta: [
    { title: "Directory settings — Gravity Pants Admin" },
    { name: "description", content: "Settings for the public Directory page." },
    { property: "og:title", content: "Directory settings — Gravity Pants Admin" },
    { property: "og:description", content: "Settings for the public Directory page." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: DirectorySettingsAdmin,
});

const FORMAT: Record<string, string> = { "9x16": "9:16", "1x1": "1:1", "16x9": "16:9" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Field({ label, hint, children }: { label: string; hint?: string | undefined; children: React.ReactNode }) {
  return <div className="space-y-1.5"><span className="block text-[13px] font-medium text-secondary-text">{label}</span>{children}{hint && <p className="text-[12px] text-secondary-text">{hint}</p>}</div>;
}
function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-border bg-card px-4 py-3">
      <span><span className="block text-[14px] font-medium">{label}</span><span className="block text-[13px] text-secondary-text">{hint}</span></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
    </label>
  );
}
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-control-fill p-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn("h-9 rounded-md px-3.5 text-[14px] font-medium", value === v ? "bg-card text-foreground shadow-sm" : "text-secondary-text")}>{l}</button>
      ))}
    </div>
  );
}
function Chips({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => {
        const on = value.includes(v);
        return <button key={v} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}
          className={cn("h-8 rounded-lg border px-2.5 text-[13px]", on ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground")}>{l}</button>;
      })}
    </div>
  );
}

function DirectorySettingsAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(getDirectorySettingsAdmin);
  const save = useServerFn(saveDirectorySettings);
  const searchFn = useServerFn(searchDirectory);
  const brandsFn = useServerFn(listPublicBrands);
  const siteFn = useServerFn(listSiteReels);
  const saved = useQuery({ queryKey: ["admin", "directory-settings"], queryFn: () => load() });
  const library = useQuery({ queryKey: ["admin", "directory-library"], queryFn: async () => (await searchFn({ data: { pageSize: 240 } })).reels });
  const [s, setS] = useState<DirectorySettings>(DEFAULT_DIRECTORY_SETTINGS);
  const loadViews = useServerFn(getDirectoryWeeklyViews);
  const weeklyViews = useQuery({
    queryKey: ["admin", "directory-weekly-views", library.data?.map((r) => r.id)],
    enabled: !!library.data && s.rule === "viewed",
    queryFn: () => loadViews({ data: { ids: (library.data ?? []).map((r) => r.id) } }),
  });
  const brands = useQuery({ queryKey: ["admin", "directory-public-brands"], queryFn: () => brandsFn() });
  const siteReels = useQuery({ queryKey: ["admin", "site-reels-public"], queryFn: () => siteFn() });
  const { families, all: allMoods } = useMoodCatalog();
  const loadG = useServerFn(getGreetingAdmin);
  const saveG = useServerFn(saveGreetingConfig);
  const savedG = useQuery({ queryKey: ["admin", "directory-greeting"], queryFn: () => loadG() });
  const [g, setG] = useState<GreetingConfig>(DEFAULT_GREETING);
  useEffect(() => { if (savedG.data) setG(savedG.data.config); }, [savedG.data]);
  const facets = useQuery({ queryKey: ["admin", "directory-facets"], queryFn: async () => (await searchFn({ data: { pageSize: 1 } })).facets });

  const [picks, setPicks] = useState<FeaturedPick[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null | undefined>(undefined); // undefined = closed; null = main list; date = week
  const [confirmReset, setConfirmReset] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (saved.data) { setS(saved.data.settings); setPicks(saved.data.picks); } }, [saved.data]);

  const gDirty = !!savedG.data && JSON.stringify(g) !== JSON.stringify(savedG.data.config);
  const dirty = (!!saved.data && JSON.stringify({ s, picks }) !== JSON.stringify({ s: saved.data.settings, picks: saved.data.picks })) || gDirty;
  useBlocker({ shouldBlockFn: () => dirty && !window.confirm("You have unsaved changes. Leave without saving?"), enableBeforeUnload: () => dirty });

  const byId = useMemo(() => new Map((library.data ?? []).map((r) => [r.id, r])), [library.data]);
  const secondsOf = (r: FacetedReel) => (r.kind === "site" ? siteReels.data?.find((x) => x.id === r.id)?.seconds ?? null : null);
  const thisWeek = mondayOf(new Date());
  const weeks = Array.from({ length: 4 }, (_, i) => { const d = new Date(`${thisWeek}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 7 * i); return d.toISOString().slice(0, 10); });
  const listFor = (week: string | null) => picks.filter((p) => p.week === week);
  const setListFor = (week: string | null, list: FeaturedPick[]) => setPicks([...picks.filter((p) => p.week !== week), ...list]);

  const errors: string[] = [];
  if (s.source === "manual" && !s.rotateWeekly && listFor(null).length < MIN_MANUAL_PICKS) errors.push(`Pick at least ${MIN_MANUAL_PICKS} reels for the hand-picked list.`);
  if (s.showFrom && s.showUntil && new Date(s.showUntil) <= new Date(s.showFrom)) errors.push("\"Until\" must be after \"Show from\".");
  if (!s.title.trim()) errors.push("Add a label above the carousel.");
  errors.push(...greetingErrors(g));

  const preview = resolveFeatured({ ...s, showFrom: null, showUntil: null, showCarousel: true }, picks, library.data ?? [], new Date(), {}, weeklyViews.data ?? {});

  async function run(value: DirectorySettings | null, msg: string) {
    setBusy(true);
    try {
      await save({ data: { value, picks: value ? picks : [] } });
      if (!value || gDirty) await saveG({ data: { value: value ? g : null } });
      toast.success(msg);
      await qc.invalidateQueries({ queryKey: ["admin", "directory-settings"] });
      await qc.invalidateQueries({ queryKey: ["admin", "directory-greeting"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } finally { setBusy(false); }
  }
  const num = (k: "count" | "pageSize" | "autoLoadPages" | "filterCarouselGap" | "carouselLabelSize" | "carouselLabelGap", min: number, max: number) => (e: { target: { value: string } }) =>
    setS({ ...s, [k]: Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))) });

  if (saved.isLoading) return <p className="text-[14px] text-secondary-text">Loading…</p>;
  const brandOpts: [string, string][] = (brands.data ?? []).map((b) => [b.slug, b.name]);
  const catOpts: [string, string][] = CATEGORIES.map((c) => [categorySlug(c), c]);
  const moodOpts: [string, string][] = allMoods.map((m) => [m, cap(m)]);

  return (
    <div className="space-y-6">
      <PageTitle title="Directory" sub="The public Directory page. Changes show as soon as you save." />

      <Card className="space-y-3">
        <h2 className="text-[17px] font-semibold">Preview</h2>
        <div className="overflow-hidden rounded-sm border border-border font-ap">
          <div className="origin-top-left scale-[.6]" style={{ width: "166.67%", marginBottom: "-26%" }}>
            {s.showCarousel && preview.length ? (
              <FeaturedBand label={s.title || "Featured this week"} reels={preview} secondsPerReel={SPEED_SECONDS[s.speed]} seconds={secondsOf} onOpen={() => {}}
                filterGap={s.filterCarouselGap} labelSize={s.carouselLabelSize} labelGap={s.carouselLabelGap} />
            ) : <p className="bg-ap-panel py-24 text-center text-[22px] text-ap-muted">{s.showCarousel ? "No reels to show yet" : "The carousel is turned off"}</p>}
          </div>
        </div>
        <p className="text-[12px] text-secondary-text">Updates as you change things. Save to make it live on the site.</p>
      </Card>

      <HeadlineCard cfg={g} setCfg={setG} stats={savedG.data?.stats ?? []} families={families} brands={brands.data ?? []}
        hasReels={(c, b) => {
          const bs = b ? (brands.data ?? []).find((x) => x.name.toLowerCase() === b.toLowerCase())?.slug : null;
          return (!c || (facets.data?.categories[categorySlug(c)] ?? 0) > 0) && (!b || (!!bs && (facets.data?.brands[bs] ?? 0) > 0));
        }} />

      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Featured carousel</h2>
        <Toggle label="Show the carousel" hint="Turn off to hide the reel strip on the Directory." checked={s.showCarousel} onChange={(showCarousel) => setS({ ...s, showCarousel })} />
        <Field label="Label above the carousel"><Input aria-label="Label above the carousel" value={s.title} maxLength={60} onChange={(e) => setS({ ...s, title: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Space below filters (px)"><Input aria-label="Space below filters (px)" type="number" min={0} max={96} value={s.filterCarouselGap} onChange={num("filterCarouselGap", 0, 96)} className="w-28 nums" /></Field>
          <Field label="Label font size (px)"><Input aria-label="Label font size (px)" type="number" min={12} max={32} value={s.carouselLabelSize} onChange={num("carouselLabelSize", 12, 32)} className="w-28 nums" /></Field>
          <Field label="Space below label (px)"><Input aria-label="Space below label (px)" type="number" min={0} max={96} value={s.carouselLabelGap} onChange={num("carouselLabelGap", 0, 96)} className="w-28 nums" /></Field>
        </div>
        <Field label="Which reels">
          <div><Segmented label="Which reels" value={s.source} options={[["manual", "Hand-picked"], ["auto", "Automatic"]]} onChange={(source) => setS({ ...s, source })} /></div>
        </Field>
        {s.source === "manual" && !s.rotateWeekly && (
          <PickList list={listFor(null)} byId={byId} secondsOf={secondsOf} onChange={(l) => setListFor(null, l)} onAdd={() => setPickerFor(null)}
            error={tried && listFor(null).length < MIN_MANUAL_PICKS ? `Pick at least ${MIN_MANUAL_PICKS} reels.` : null} />
        )}
        {(s.source === "auto" || s.rotateWeekly) && (
          <div className="space-y-3 rounded-sm border border-border p-4">
            {s.rotateWeekly && <p className="text-[13px] text-secondary-text">Used for any week without hand-picked reels.</p>}
            <Field label="Rule">
              <select aria-label="Rule" value={s.rule} onChange={(e) => setS({ ...s, rule: e.target.value as DirectorySettings["rule"] })}
                className="h-10 rounded-sm border border-input bg-card px-3 text-[14px]">
                <option value="newest">Newest</option>
                <option value="viewed">Most viewed this week</option>
                <option value="saved">Most saved</option>
                <option value="random">Random from all published</option>
              </select>
            </Field>
            <Field label="Only these moods (optional)"><Chips label="Rule moods" options={moodOpts} value={s.ruleMoods} onChange={(ruleMoods) => setS({ ...s, ruleMoods })} /></Field>
            <Field label="Only these categories (optional)"><Chips label="Rule categories" options={catOpts} value={s.ruleCategories} onChange={(ruleCategories) => setS({ ...s, ruleCategories })} /></Field>
            <Field label="Only these brands (optional)"><Chips label="Rule brands" options={brandOpts} value={s.ruleBrands} onChange={(ruleBrands) => setS({ ...s, ruleBrands })} /></Field>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How many reels" hint="6 to 20."><Input aria-label="How many reels" type="number" min={6} max={20} value={s.count} onChange={num("count", 6, 20)} className="w-28 nums" /></Field>
          <Field label="Speed"><div><Segmented label="Speed" value={s.speed} options={[["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]]} onChange={(speed) => setS({ ...s, speed })} /></div></Field>
        </div>
        <Field label="When visitors filter" hint="Follow filters shows the top matches and changes the label to 'Featured · N matches'.">
          <div><Segmented label="When visitors filter" value={s.whenFiltering} options={[["follow", "Follow filters"], ["fixed", "Keep featured"], ["hide", "Hide"]]} onChange={(whenFiltering) => setS({ ...s, whenFiltering })} /></div>
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Schedule</h2>
        <Toggle label="Rotate weekly" hint="Start a fresh featured set every Monday." checked={s.rotateWeekly} onChange={(rotateWeekly) => setS({ ...s, rotateWeekly })} />
        {s.rotateWeekly && (
          <div className="space-y-4">
            {weeks.map((w) => (
              <div key={w} className="space-y-2 rounded-sm border border-border p-4">
                <p className="flex items-center gap-2 text-[14px] font-medium nums">
                  Week of {new Date(`${w}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}
                  {w === thisWeek && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Live</span>}
                </p>
                <PickList list={listFor(w)} byId={byId} secondsOf={secondsOf} onChange={(l) => setListFor(w, l.map((p) => ({ ...p, week: w })))} onAdd={() => setPickerFor(w)}
                  emptyText="No picks — this week uses the automatic rule." />
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Show from (optional)"><Input aria-label="Show from" type="datetime-local" value={s.showFrom ?? ""} onChange={(e) => setS({ ...s, showFrom: e.target.value || null })} /></Field>
          <Field label="Until (optional)"><Input aria-label="Until" type="datetime-local" value={s.showUntil ?? ""} onChange={(e) => setS({ ...s, showUntil: e.target.value || null })} /></Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Filters & results</h2>
        <Toggle label="Show empty categories as 'Coming soon'" hint="Categories without reels stay visible in the Category filter." checked={s.comingSoon} onChange={(comingSoon) => setS({ ...s, comingSoon })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reels per page" hint="8 to 48."><Input aria-label="Reels per page" type="number" min={8} max={48} value={s.pageSize} onChange={num("pageSize", 8, 48)} className="w-28 nums" /></Field>
          <Field label="Auto-load pages after first 'Show more'" hint="0 to 5. 0 means visitors always click."><Input aria-label="Auto-load pages" type="number" min={0} max={5} value={s.autoLoadPages} onChange={num("autoLoadPages", 0, 5)} className="w-28 nums" /></Field>
        </div>
        <Field label="Moods in the headline rotation" hint={s.headlineMoods.length ? `${s.headlineMoods.length} chosen.` : "None chosen — the headline rotates through every mood."}>
          <div className="space-y-2">
            {families.map((f) => (
              <div key={f.family} className="grid gap-2 sm:grid-cols-[100px_1fr]">
                <span className="pt-1.5 text-[13px] font-medium">{f.family}</span>
                <Chips label={`${f.family} headline moods`} options={f.moods.map((m) => [m, cap(m)])} value={s.headlineMoods} onChange={(headlineMoods) => setS({ ...s, headlineMoods })} />
              </div>
            ))}
          </div>
        </Field>
      </Card>

      {tried && errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-[14px] text-destructive">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy || (!dirty && !!saved.data)} onClick={() => { setTried(true); if (!errors.length) void run(s, "Directory settings saved"); }}>
          {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setConfirmReset(true)}>Reset to default</Button>
        {dirty && <span className="text-[13px] text-secondary-text">Unsaved changes</span>}
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the Directory settings?</AlertDialogTitle>
            <AlertDialogDescription>This puts every setting back to its default, restores the starter greetings and removes all hand-picked reels. The site updates right away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run(null, "Directory settings reset to default")}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReelPicker open={pickerFor !== undefined} onClose={() => setPickerFor(undefined)} library={library.data ?? []} moods={moodOpts} cats={catOpts}
        chosen={new Set(listFor(pickerFor ?? null).map((p) => p.reelId))}
        onAdd={(rs) => {
          const week = pickerFor ?? null;
          const have = new Set(listFor(week).map((p) => p.reelId));
          setListFor(week, [...listFor(week), ...rs.filter((r) => !have.has(r.id)).map((r) => ({ reelId: r.id, kind: r.kind, week }))]);
          setPickerFor(undefined);
        }} />
    </div>
  );
}

function PickList({ list, byId, secondsOf, onChange, onAdd, error, emptyText }: {
  list: FeaturedPick[]; byId: Map<string, FacetedReel>; secondsOf: (r: FacetedReel) => number | null;
  onChange: (l: FeaturedPick[]) => void; onAdd: () => void; error?: string | null | undefined; emptyText?: string | undefined;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => { if (to < 0 || to >= list.length) return; const l = [...list]; const [x] = l.splice(from, 1); l.splice(to, 0, x!); onChange(l); };
  return (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-[13px] text-secondary-text">{emptyText ?? "No reels picked yet."}</p>}
      <ol className="space-y-1.5">
        {list.map((p, i) => {
          const r = byId.get(p.reelId);
          const sec = r ? secondsOf(r) : null;
          return (
            <li key={p.reelId} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
              className={cn("flex items-center gap-3 rounded-sm border border-border bg-card p-2", drag === i && "opacity-50")}>
              <GripVertical aria-hidden className="size-4 shrink-0 cursor-grab text-secondary-text" strokeWidth={1.7} />
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm bg-control-fill">
                {r?.poster && <img src={r.poster} alt="" className="max-h-full max-w-full object-contain" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{r?.title ?? "Reel no longer published"}</span>
                <span className="block truncate text-[12px] text-secondary-text nums">{r ? `${r.brand_name} · ${FORMAT[r.formats[0] ?? ""] ?? ""}${sec ? ` · ${sec} sec` : ""}` : "It won't show on the site."}</span>
              </span>
              <button type="button" aria-label={`Move ${r?.title ?? "reel"} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-8 place-items-center rounded-lg text-secondary-text hover:bg-control-fill disabled:opacity-30"><ArrowUp className="size-4" strokeWidth={1.7} /></button>
              <button type="button" aria-label={`Move ${r?.title ?? "reel"} down`} disabled={i === list.length - 1} onClick={() => move(i, i + 1)} className="grid size-8 place-items-center rounded-lg text-secondary-text hover:bg-control-fill disabled:opacity-30"><ArrowDown className="size-4" strokeWidth={1.7} /></button>
              <button type="button" aria-label={`Remove ${r?.title ?? "reel"}`} onClick={() => onChange(list.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg text-secondary-text hover:bg-control-fill"><X className="size-4" strokeWidth={1.7} /></button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onAdd}><Plus className="size-4" strokeWidth={1.7} /> Add reels</Button>
        <span className="text-[12px] text-secondary-text">Pick 6–20 reels. They show in this order.</span>
      </div>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}

function ReelPicker({ open, onClose, library, moods, cats, chosen, onAdd }: {
  open: boolean; onClose: () => void; library: FacetedReel[]; moods: [string, string][]; cats: [string, string][]; chosen: Set<string>; onAdd: (r: FacetedReel[]) => void;
}) {
  const [q, setQ] = useState("");
  const [mood, setMood] = useState("");
  const [cat, setCat] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => { if (open) { setSel([]); setQ(""); } }, [open]);
  const t = q.toLowerCase();
  const shown = library.filter((r) => (!t || r.title.toLowerCase().includes(t) || r.brand_name.toLowerCase().includes(t)) && (!mood || r.moods.includes(mood)) && (!cat || r.cat_slug === cat));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader><DialogTitle>Add reels</DialogTitle></DialogHeader>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or brand" aria-label="Search reels" />
          <select aria-label="Mood" value={mood} onChange={(e) => setMood(e.target.value)} className="h-10 rounded-sm border border-input bg-card px-2 text-[14px]">
            <option value="">Any mood</option>{moods.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 rounded-sm border border-input bg-card px-2 text-[14px]">
            <option value="">Any category</option>{cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {shown.length === 0 && <li className="py-6 text-center text-[14px] text-secondary-text">No published reels match.</li>}
          {shown.map((r) => {
            const already = chosen.has(r.id);
            const on = sel.includes(r.id);
            return (
              <li key={r.id}>
                <label className={cn("flex cursor-pointer items-center gap-3 rounded-sm p-2 hover:bg-control-fill", already && "opacity-60")}>
                  <input type="checkbox" disabled={already} checked={already || on} onChange={() => setSel(on ? sel.filter((x) => x !== r.id) : [...sel, r.id])} className="size-4 accent-primary" />
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-sm bg-control-fill">{r.poster && <img src={r.poster} alt="" className="max-h-full max-w-full object-contain" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{r.title}</span>
                    <span className="block truncate text-[12px] text-secondary-text">{r.brand_name} · {r.category}{already ? " · Already chosen" : ""}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!sel.length} onClick={() => onAdd(library.filter((r) => sel.includes(r.id)))}>{sel.length ? `Add ${sel.length}` : "Add"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
