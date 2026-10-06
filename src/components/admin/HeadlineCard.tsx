import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/admin/AdminShell";
import { CATEGORIES } from "@/lib/directory/directory";
import { MOOD_FAMILY_COLORS, type MoodFamily } from "@/lib/directory/mood-admin";
import {
  MAX_GREETING, RULE_INFO, VARIANT_KEYS, WEEKDAYS, campaignStatus, chooseGreeting, nextOccurrence, plainText, toSegments, fillTemplate, worstCaseLength,
  type Chosen, type DateRule, type GEvent, type GreetingConfig, type Variant, type WeatherKind,
} from "@/lib/directory/greeting";
import { cn } from "@/lib/utils";

type Stats = { rule: string; shown: number; sessions: number; clicks: number; filters: number }[];
type Props = {
  cfg: GreetingConfig; setCfg: (c: GreetingConfig) => void; stats: Stats;
  families: { family: string; moods: string[] }[]; brands: { slug: string; name: string }[];
  hasReels: (c: string | null, b: string | null) => boolean;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const sel = "h-9 rounded-sm border border-input bg-card px-2 text-[14px]";

/** Validation used by the page's Save button. */
export function greetingErrors(cfg: GreetingConfig): string[] {
  const out: string[] = [];
  const check = (name: string, tpl: string, event = "") => {
    const n = plainText(fillTemplate(tpl, { day: "Wednesday", days: 14, event, city: "San Francisco", brand: "Brand name", count: 999 })).length;
    if (n > MAX_GREETING) out.push(`"${name}" greeting can reach ${n} characters — keep it under ${MAX_GREETING}.`);
  };
  cfg.events.filter((e) => e.active).forEach((e) => check(e.name, e.template, e.name));
  cfg.variants.filter((v) => v.active).forEach((v) => check(`${v.ruleType} ${v.key}`, v.template));
  if (cfg.campaign?.template) check("Campaign", cfg.campaign.template);
  if (cfg.campaign?.startsAt && cfg.campaign.endsAt && new Date(cfg.campaign.endsAt) <= new Date(cfg.campaign.startsAt)) out.push("Campaign must end after it starts.");
  return out;
}

function familyOf(families: Props["families"], mood: string) { return families.find((f) => f.moods.includes(mood))?.family as MoodFamily | undefined; }

function MoodChip({ mood, families }: { mood: string; families: Props["families"] }) {
  const fam = familyOf(families, mood);
  const c = fam ? MOOD_FAMILY_COLORS[fam] : null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-0.5 text-[13px]">
      <span aria-hidden className="size-2 rounded-full bg-muted" style={c ? { backgroundColor: c.bg } : undefined} />
      {mood || "—"}{!fam && mood && <span className="text-destructive"> (not in mood list)</span>}
    </span>
  );
}

function MoodSelect({ value, onChange, families, label }: { value: string; onChange: (v: string) => void; families: Props["families"]; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={sel}>
      {!familyOf(families, value) && <option value={value}>{value || "Choose a mood"}</option>}
      {families.map((f) => <optgroup key={f.family} label={f.family}>{f.moods.map((m) => <option key={m} value={m}>{cap(m)}</option>)}</optgroup>)}
    </select>
  );
}

function Headline({ c }: { c: Chosen }) {
  const n = plainText(c.filled).length;
  return (
    <div className="rounded-sm bg-ap-panel px-5 py-6 font-ap">
      <p className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">
        {toSegments(c.filled).map((s, i) => <span key={i} className={s.bold ? "text-ap-ink" : "text-ap-muted"}>{s.text}</span>)}
        <span className="text-ap-muted"> Show me something: </span><span className="text-ap-blue">[ {c.mood} ]</span>
      </p>
      <p className="mt-2 text-[12px] text-secondary-text">Chosen by: {c.source}{n > MAX_GREETING && <span className="text-destructive"> · {n} characters, over the {MAX_GREETING} limit</span>}</p>
    </div>
  );
}

function TemplateInput({ value, onChange, label, event }: { value: string; onChange: (v: string) => void; label: string; event?: string }) {
  const n = worstCaseLength(value.replace(/\{event\}/g, event ?? ""));
  return (
    <div className="space-y-1.5">
      <Input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex flex-wrap items-center gap-1">
        {["{day}", "{when}", "{days}", "{event}", "{city}", "{brand}", "{count}", "**bold**"].map((t) => (
          <button key={t} type="button" onClick={() => onChange(`${value}${t === "**bold**" ? "****" : t}`)} className="h-7 rounded-lg border border-border px-2 text-[12px]">{t}</button>
        ))}
        <span className={cn("ml-auto text-[12px] nums", n > MAX_GREETING ? "text-destructive" : "text-secondary-text")}>up to {n}/{MAX_GREETING}</span>
      </div>
    </div>
  );
}

function ruleText(r: DateRule, events: GEvent[]) {
  switch (r.kind) {
    case "fixed": return `${MONTHS[r.month - 1]} ${r.day}`;
    case "month": return `All of ${MONTHS[r.month - 1]}`;
    case "nth": return `${r.n === -1 ? "Last" : ["", "1st", "2nd", "3rd", "4th", "5th"][r.n]} ${WEEKDAYS[r.weekday]} of ${MONTHS[r.month - 1]}`;
    case "offset": return `${r.days >= 0 ? "+" : ""}${r.days} days from ${events.find((e) => e.id === r.eventId)?.name ?? "?"}`;
    case "explicit": return `${r.dates.length} set dates`;
  }
}

export function HeadlineCard({ cfg, setCfg, stats, families, brands, hasReels }: Props) {
  const now = new Date();
  const [pDate, setPDate] = useState(now.toISOString().slice(0, 10));
  const [pTime, setPTime] = useState(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  const [pCountry, setPCountry] = useState("US");
  const [pWx, setPWx] = useState<"auto" | "sunny" | "rain" | "snow" | "fog" | "hot" | "cold">("auto");
  const [pReturning, setPReturning] = useState(false);
  const [editing, setEditing] = useState<GEvent | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  const wx = (w: typeof pWx) => w === "auto" ? null : { kind: ({ sunny: "clear", rain: "rain", snow: "snow", fog: "fog", hot: "clear", cold: "clear" } as Record<string, WeatherKind>)[w]!, tempC: w === "hot" ? 32 : w === "cold" ? -2 : 18, isDay: true, sunset: null };
  const at = (date: string, time: string) => new Date(`${date}T${time || "10:00"}:00`);
  const ctx = (d: Date, withWx: boolean) => ({ now: d, country: pCountry.trim().toUpperCase() || null, city: "Brooklyn", weather: withWx ? wx(pWx) : null, returningMood: pReturning ? "cozy" : null, hasReels, fallbackMood: "cozy" });
  const preview = chooseGreeting(cfg, ctx(at(pDate, pTime), true));
  const next14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(16, 0, 0, 0); return { d, c: chooseGreeting(cfg, { ...ctx(d, false), returningMood: null }) }; });

  const moveRule = (from: number, to: number) => {
    const list = cfg.rules.filter((r) => r.type !== "fallback");
    if (to < 0 || to >= list.length) return;
    const [x] = list.splice(from, 1); list.splice(to, 0, x!);
    setCfg({ ...cfg, rules: [...list, { type: "fallback", enabled: true }] });
  };
  const setEvent = (e: GEvent) => setCfg({ ...cfg, events: cfg.events.some((x) => x.id === e.id) ? cfg.events.map((x) => (x.id === e.id ? e : x)) : [...cfg.events, e] });
  const setVariant = (v: Variant) => setCfg({ ...cfg, variants: cfg.variants.some((x) => x.id === v.id) ? cfg.variants.map((x) => (x.id === v.id ? v : x)) : [...cfg.variants, v] });
  const camp = cfg.campaign;
  const status = camp ? campaignStatus(camp, now) : null;

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold">Headline</h2>
        <p className="text-[13px] text-secondary-text">The greeting at the top of the Directory. The first rule that matches wins, and its mood leads the rotation.</p>
      </div>

      {/* a) Preview as */}
      <section className="space-y-3" aria-label="Preview as">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-secondary-text">Date<Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} className="w-40" /></label>
          <label className="text-[12px] text-secondary-text">Time<Input type="time" value={pTime} onChange={(e) => setPTime(e.target.value)} className="w-28" /></label>
          <label className="text-[12px] text-secondary-text">Country<Input value={pCountry} maxLength={2} onChange={(e) => setPCountry(e.target.value)} className="w-20 uppercase" /></label>
          <label className="text-[12px] text-secondary-text">Weather
            <select value={pWx} onChange={(e) => setPWx(e.target.value as typeof pWx)} className={cn(sel, "block")}>
              {["auto", "sunny", "rain", "snow", "fog", "hot", "cold"].map((w) => <option key={w} value={w}>{w === "auto" ? "Auto (none)" : cap(w)}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-secondary-text">Visitor
            <select value={pReturning ? "r" : "n"} onChange={(e) => setPReturning(e.target.value === "r")} className={cn(sel, "block")}>
              <option value="n">New</option><option value="r">Returning</option>
            </select>
          </label>
        </div>
        <Headline c={preview} />
        <details className="text-[13px]">
          <summary className="cursor-pointer font-medium">Next 14 days ({pCountry.toUpperCase() || "no country"}, afternoon, no weather)</summary>
          <ul className="mt-2 divide-y divide-border rounded-sm border border-border">
            {next14.map(({ d, c }) => (
              <li key={d.toDateString()} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 px-3 py-1.5">
                <span className="text-secondary-text nums">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                <span>{plainText(c.filled)} <span className="text-secondary-text">· {c.source}</span></span>
                <MoodChip mood={c.mood} families={families} />
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* b) Rules */}
      <section className="space-y-2">
        <h3 className="text-[15px] font-semibold">Greeting rules</h3>
        <ol className="divide-y divide-border rounded-sm border border-border">
          {cfg.rules.map((r, i) => {
            const info = RULE_INFO[r.type];
            const fixed = r.type === "fallback";
            return (
              <li key={r.type} draggable={!fixed} onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && !fixed) moveRule(drag, i); setDrag(null); }}
                className="flex items-center gap-3 px-3 py-2">
                <GripVertical className={cn("size-4 text-secondary-text", fixed && "opacity-0")} strokeWidth={1.7} aria-hidden />
                <span className="w-5 text-[13px] text-secondary-text nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{info.label}</p>
                  <p className="text-[12px] text-secondary-text">{info.desc} e.g. "{info.example}"</p>
                </div>
                {!fixed && <>
                  <button type="button" aria-label={`Move ${info.label} up`} onClick={() => moveRule(i, i - 1)} className="grid size-7 place-items-center rounded-lg hover:bg-control-fill"><ArrowUp className="size-3.5" strokeWidth={1.7} /></button>
                  <button type="button" aria-label={`Move ${info.label} down`} onClick={() => moveRule(i, i + 1)} className="grid size-7 place-items-center rounded-lg hover:bg-control-fill"><ArrowDown className="size-3.5" strokeWidth={1.7} /></button>
                </>}
                <input type="checkbox" aria-label={`${info.label} on`} disabled={fixed} checked={r.enabled}
                  onChange={(e) => setCfg({ ...cfg, rules: cfg.rules.map((x) => (x.type === r.type ? { ...x, enabled: e.target.checked } : x)) })} className="size-4 accent-primary" />
              </li>
            );
          })}
        </ol>
      </section>

      {/* c) Campaign */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-semibold">Campaign greeting</h3>
          {status && <span className={cn("rounded-lg px-2 py-0.5 text-[12px]", status === "live" ? "bg-primary/10 text-primary" : "bg-control-fill text-secondary-text")}>{status === "live" ? "Live now" : status === "scheduled" ? "Scheduled" : "Ended"}</span>}
          {camp ? <Button size="sm" variant="outline" className="ml-auto" onClick={() => setCfg({ ...cfg, campaign: null })}>Remove</Button>
            : <Button size="sm" variant="outline" className="ml-auto" onClick={() => setCfg({ ...cfg, campaign: { template: "**Spring sale** is on.", mood: "fresh", category: null, brand: null, startsAt: null, endsAt: null } })}><Plus className="size-4" strokeWidth={1.7} />Add campaign</Button>}
        </div>
        {camp && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><TemplateInput label="Campaign greeting" value={camp.template} onChange={(template) => setCfg({ ...cfg, campaign: { ...camp, template } })} /></div>
            <MoodSelect label="Campaign mood" value={camp.mood} families={families} onChange={(mood) => setCfg({ ...cfg, campaign: { ...camp, mood } })} />
            <LinkSelects category={camp.category} brand={camp.brand} brands={brands} onChange={(category, brand) => setCfg({ ...cfg, campaign: { ...camp, category, brand } })} />
            <label className="text-[12px] text-secondary-text">Starts<Input type="datetime-local" value={camp.startsAt ?? ""} onChange={(e) => setCfg({ ...cfg, campaign: { ...camp, startsAt: e.target.value || null } })} /></label>
            <label className="text-[12px] text-secondary-text">Ends<Input type="datetime-local" value={camp.endsAt ?? ""} onChange={(e) => setCfg({ ...cfg, campaign: { ...camp, endsAt: e.target.value || null } })} /></label>
            <div className="sm:col-span-2"><Headline c={{ rule: "campaign", source: "Campaign", filled: fillTemplate(camp.template, { day: WEEKDAYS[now.getDay()]! }), segments: [], mood: camp.mood, category: camp.category, brand: camp.brand }} /></div>
          </div>
        )}
      </section>

      {/* d) Calendar */}
      <section className="space-y-2">
        <div className="flex items-center"><h3 className="text-[15px] font-semibold">Calendar</h3>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditing({ id: `ev-${Date.now()}`, kind: "marketing", name: "", template: "**{event}** is {when}.", mood: "fresh", rule: { kind: "fixed", month: 1, day: 1 }, leadDays: 14, regions: ["GLOBAL"], category: null, brand: null, active: true })}>
            <Plus className="size-4" strokeWidth={1.7} />Add date</Button></div>
        <Tabs defaultValue="marketing">
          <TabsList><TabsTrigger value="marketing">Marketing dates</TabsTrigger><TabsTrigger value="fun_day">Fun days</TabsTrigger></TabsList>
          {(["marketing", "fun_day"] as const).map((k) => (
            <TabsContent key={k} value={k}>
              <div className="overflow-x-auto rounded-sm border border-border">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-control-fill text-secondary-text"><tr>{["Name", "Next date", "Greeting", "Mood", "Regions", "Linked", "Active"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">
                    {cfg.events.filter((e) => e.kind === k).map((e) => (
                      <tr key={e.id} className="cursor-pointer hover:bg-control-fill/50" onClick={() => setEditing(e)}>
                        <td className="px-3 py-2 font-medium"><button type="button" className="text-left" onClick={() => setEditing(e)}>{e.name}</button></td>
                        <td className="px-3 py-2 nums whitespace-nowrap">{fmtDate(nextOccurrence(e, now, cfg.events))}</td>
                        <td className="px-3 py-2">{plainText(fillTemplate(e.template, { day: "Tuesday", days: 12, event: e.name }))}</td>
                        <td className="px-3 py-2"><MoodChip mood={e.mood} families={families} /></td>
                        <td className="px-3 py-2">{e.regions.join(", ")}</td>
                        <td className="px-3 py-2">{e.brand ?? e.category ?? "—"}</td>
                        <td className="px-3 py-2" onClick={(x) => x.stopPropagation()}><input type="checkbox" aria-label={`${e.name} active`} checked={e.active} onChange={(x) => setEvent({ ...e, active: x.target.checked })} className="size-4 accent-primary" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* e) Variants */}
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Weather, time & day</h3>
        {(["weather", "time_of_day", "day_of_week", "season"] as const).map((t) => (
          <div key={t} className="space-y-1.5">
            <div className="flex items-center"><p className="text-[13px] font-medium">{RULE_INFO[t].label}</p>
              <select aria-label={`Add ${RULE_INFO[t].label} variant`} value="" className={cn(sel, "ml-auto h-8 text-[13px]")}
                onChange={(e) => e.target.value && setVariant({ id: `${t}-${e.target.value}`, ruleType: t, key: e.target.value, template: "", mood: "fresh", active: true })}>
                <option value="">Add…</option>
                {VARIANT_KEYS[t].filter((k) => !cfg.variants.some((v) => v.ruleType === t && v.key === k)).map((k) => <option key={k} value={k}>{k}</option>)}
              </select></div>
            {cfg.variants.filter((v) => v.ruleType === t).map((v) => (
              <div key={v.id} className="grid items-start gap-2 sm:grid-cols-[110px_1fr_160px_24px]">
                <span className="pt-2 text-[13px] text-secondary-text">{v.key}</span>
                <TemplateInput label={`${v.key} greeting`} value={v.template} onChange={(template) => setVariant({ ...v, template })} />
                <MoodSelect label={`${v.key} mood`} value={v.mood} families={families} onChange={(mood) => setVariant({ ...v, mood })} />
                <input type="checkbox" aria-label={`${v.key} on`} checked={v.active} onChange={(e) => setVariant({ ...v, active: e.target.checked })} className="mt-2.5 size-4 accent-primary" />
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* f) Guardrails */}
      <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-secondary-text">
        <li>Keep each greeting under {MAX_GREETING} characters, with one bold idea.</li>
        <li>Don't assume a visitor's religion or culture — use regions for regional holidays.</li>
        <li>Avoid sombre or memorial days.</li>
      </ul>

      {/* Analytics */}
      <section className="space-y-2">
        <h3 className="text-[15px] font-semibold">Last 30 days</h3>
        {stats.length ? (
          <table className="w-full text-left text-[13px] nums">
            <thead className="text-secondary-text"><tr><th className="py-1 font-medium">Rule</th><th className="font-medium">Times shown</th><th className="font-medium">Mood-word click rate</th><th className="font-medium">Used filters</th></tr></thead>
            <tbody className="divide-y divide-border">
              {stats.map((s) => (
                <tr key={s.rule}><td className="py-1.5">{RULE_INFO[s.rule as keyof typeof RULE_INFO]?.label ?? s.rule}</td><td>{s.shown}</td>
                  <td>{s.sessions ? Math.round((s.clicks / s.sessions) * 100) : 0}%</td><td>{s.sessions ? Math.round((s.filters / s.sessions) * 100) : 0}%</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-[13px] text-secondary-text">No greetings shown yet.</p>}
      </section>

      <EventSheet event={editing} events={cfg.events} families={families} brands={brands} onClose={() => setEditing(null)}
        onSave={(e) => { setEvent(e); setEditing(null); }}
        onDelete={(id) => { setCfg({ ...cfg, events: cfg.events.filter((x) => x.id !== id) }); setEditing(null); }} />
    </Card>
  );
}

function LinkSelects({ category, brand, brands, onChange }: { category: string | null; brand: string | null; brands: Props["brands"]; onChange: (c: string | null, b: string | null) => void }) {
  return (
    <div className="flex gap-2">
      <select aria-label="Linked category" value={category ?? ""} onChange={(e) => onChange(e.target.value || null, brand)} className={cn(sel, "min-w-0 flex-1")}>
        <option value="">No category</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select aria-label="Linked brand" value={brand ?? ""} onChange={(e) => onChange(category, e.target.value || null)} className={cn(sel, "min-w-0 flex-1")}>
        <option value="">No brand</option>
        {brand && !brands.some((b) => b.name === brand) && <option>{brand}</option>}
        {brands.map((b) => <option key={b.slug}>{b.name}</option>)}
      </select>
    </div>
  );
}

function EventSheet({ event, events, families, brands, onClose, onSave, onDelete }: {
  event: GEvent | null; events: GEvent[]; families: Props["families"]; brands: Props["brands"];
  onClose: () => void; onSave: (e: GEvent) => void; onDelete: (id: string) => void;
}) {
  const [e, setE] = useState<GEvent | null>(event);
  const [seen, setSeen] = useState<GEvent | null>(event);
  if (event !== seen) { setSeen(event); setE(event); }
  if (!e) return <Sheet open={false} onOpenChange={onClose}><SheetContent /></Sheet>;
  const r = e.rule;
  const setRule = (rule: DateRule) => setE({ ...e, rule });
  const num = (v: string, d = 1) => Number(v) || d;
  const isNew = !events.some((x) => x.id === e.id);
  return (
    <Sheet open={!!event} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full space-y-4 overflow-y-auto sm:max-w-[480px]">
        <SheetHeader><SheetTitle>{isNew ? "Add date" : e.name}</SheetTitle></SheetHeader>
        <label className="block text-[13px] font-medium">Name<Input value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} /></label>
        <label className="block text-[13px] font-medium">Type
          <select value={e.kind} onChange={(x) => setE({ ...e, kind: x.target.value as GEvent["kind"] })} className={cn(sel, "block w-full")}><option value="marketing">Marketing date (countdown)</option><option value="fun_day">Fun day</option></select></label>
        <div className="text-[13px] font-medium">Greeting<TemplateInput label="Greeting" value={e.template} event={e.name} onChange={(template) => setE({ ...e, template })} /></div>
        <div className="text-[13px] font-medium">Mood <MoodSelect label="Mood" value={e.mood} families={families} onChange={(mood) => setE({ ...e, mood })} /></div>
        <fieldset className="space-y-2 rounded-sm border border-border p-3">
          <legend className="px-1 text-[13px] font-medium">Date rule</legend>
          <select aria-label="Rule type" value={r.kind} className={cn(sel, "w-full")} onChange={(x) => {
            const k = x.target.value as DateRule["kind"];
            setRule(k === "fixed" ? { kind: k, month: 1, day: 1 } : k === "nth" ? { kind: k, month: 5, weekday: 0, n: 2 } : k === "offset" ? { kind: k, eventId: events[0]?.id ?? "", days: 1 } : k === "month" ? { kind: k, month: 11 } : { kind: k, dates: [] });
          }}>
            <option value="fixed">Fixed date</option><option value="nth">Nth weekday of a month</option><option value="offset">Offset from another date</option><option value="explicit">Set dates per year</option><option value="month">Whole month</option>
          </select>
          {(r.kind === "fixed" || r.kind === "nth" || r.kind === "month") && (
            <select aria-label="Month" value={r.month} onChange={(x) => setRule({ ...r, month: num(x.target.value) })} className={cn(sel, "w-full")}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          )}
          {r.kind === "fixed" && <Input aria-label="Day" type="number" min={1} max={31} value={r.day} onChange={(x) => setRule({ ...r, day: Math.min(31, num(x.target.value)) })} />}
          {r.kind === "nth" && <div className="flex gap-2">
            <select aria-label="Which" value={r.n} onChange={(x) => setRule({ ...r, n: Number(x.target.value) })} className={sel}>{[1, 2, 3, 4, 5, -1].map((n) => <option key={n} value={n}>{n === -1 ? "Last" : `#${n}`}</option>)}</select>
            <select aria-label="Weekday" value={r.weekday} onChange={(x) => setRule({ ...r, weekday: Number(x.target.value) })} className={cn(sel, "flex-1")}>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
          </div>}
          {r.kind === "offset" && <div className="flex gap-2">
            <Input aria-label="Days" type="number" value={r.days} onChange={(x) => setRule({ ...r, days: Number(x.target.value) || 0 })} className="w-20" />
            <select aria-label="From" value={r.eventId} onChange={(x) => setRule({ ...r, eventId: x.target.value })} className={cn(sel, "flex-1")}>{events.filter((x) => x.id !== e.id).map((x) => <option key={x.id} value={x.id}>days from {x.name}</option>)}</select>
          </div>}
          {r.kind === "explicit" && <textarea aria-label="Dates, one per line (YYYY-MM-DD)" rows={4} className="w-full rounded-sm border border-input bg-card p-2 text-[13px] nums"
            defaultValue={r.dates.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`).join("\n")}
            onBlur={(x) => setRule({ kind: "explicit", dates: x.target.value.split(/\s+/).map((l) => l.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)).filter(Boolean).map((m) => ({ year: +m![1]!, month: +m![2]!, day: +m![3]! })) })} />}
          <p className="text-[12px] text-secondary-text">{ruleText(r, events)} · next: {fmtDate(nextOccurrence(e, new Date(), [...events.filter((x) => x.id !== e.id), e]))}</p>
        </fieldset>
        {e.kind === "marketing" && <label className="block text-[13px] font-medium">Countdown starts (days before)<Input type="number" min={0} max={60} value={e.leadDays} onChange={(x) => setE({ ...e, leadDays: Math.max(0, Math.min(60, Number(x.target.value) || 0)) })} className="w-24" /></label>}
        <label className="block text-[13px] font-medium">Regions
          <Input value={e.regions.join(", ")} onChange={(x) => setE({ ...e, regions: x.target.value.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 60) })} />
          <span className="text-[12px] font-normal text-secondary-text">GLOBAL, or country codes like US, GB, CA.</span></label>
        <div className="text-[13px] font-medium">Linked filter<LinkSelects category={e.category} brand={e.brand} brands={brands} onChange={(category, brand) => setE({ ...e, category, brand })} /></div>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} className="size-4 accent-primary" />Active</label>
        <div className="flex gap-2 pt-2">
          <Button disabled={!e.name.trim() || !e.template.trim()} onClick={() => onSave(e)}>Done</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!isNew && <Button variant="outline" className="ml-auto text-destructive" onClick={() => onDelete(e.id)}>Delete</Button>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
