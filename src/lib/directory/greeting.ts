import { z } from "zod";

/** Dynamic Directory headline greeting: config shape, seeds and the pure chooser shared by the site and the admin preview. */

export const RULE_TYPES = ["campaign", "countdown", "fun_day", "weather", "season", "returning", "time_of_day", "day_of_week", "fallback"] as const;
export type RuleType = (typeof RULE_TYPES)[number];
export const MAX_GREETING = 32;

export const RULE_INFO: Record<RuleType, { label: string; desc: string; example: string }> = {
  campaign: { label: "Campaign", desc: "A greeting the team schedules for a launch or sale.", example: "Spring sale is on." },
  countdown: { label: "Countdown", desc: "A marketing date inside its lead window.", example: "Black Friday is in 12 days." },
  fun_day: { label: "Fun day", desc: "Today is a fun day linked to reels in the Directory.", example: "Happy National Chocolate Day." },
  weather: { label: "Weather", desc: "Notable weather where the visitor is.", example: "Rainy Tuesday." },
  season: { label: "Season moment", desc: "First day of a season or the longest day.", example: "First day of autumn." },
  returning: { label: "Returning", desc: "A visitor back after 12+ hours, with their last mood.", example: "Welcome back." },
  time_of_day: { label: "Time of day", desc: "Morning, lunch, golden hour, late night.", example: "Golden hour." },
  day_of_week: { label: "Day of week", desc: "Monday, Friday and the weekend.", example: "Friday feeling." },
  fallback: { label: "Fallback", desc: "Always last. Uses the normal mood rotation.", example: "Happy Tuesday." },
};

const dateRule = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixed"), month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) }),
  z.object({ kind: z.literal("nth"), month: z.number().int().min(1).max(12), weekday: z.number().int().min(0).max(6), n: z.number().int().min(-1).max(5) }),
  z.object({ kind: z.literal("offset"), eventId: z.string().max(60), days: z.number().int().min(-60).max(60) }),
  z.object({ kind: z.literal("explicit"), dates: z.array(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) })).max(40) }),
  z.object({ kind: z.literal("month"), month: z.number().int().min(1).max(12) }),
]);
export type DateRule = z.infer<typeof dateRule>;

const txt = (n: number) => z.string().max(n);
export const eventSchema = z.object({
  id: txt(60), kind: z.enum(["marketing", "fun_day"]), name: txt(80), template: txt(80), mood: txt(40),
  rule: dateRule, leadDays: z.number().int().min(0).max(60), regions: z.array(txt(10)).max(60),
  category: txt(80).nullable(), brand: txt(120).nullable(), active: z.boolean(),
});
export type GEvent = z.infer<typeof eventSchema>;

export const variantSchema = z.object({ id: txt(60), ruleType: z.enum(["weather", "time_of_day", "day_of_week", "season"]), key: txt(30), template: txt(80), mood: txt(40), active: z.boolean() });
export type Variant = z.infer<typeof variantSchema>;

export const campaignSchema = z.object({ template: txt(80), mood: txt(40), category: txt(80).nullable(), brand: txt(120).nullable(), startsAt: txt(30).nullable(), endsAt: txt(30).nullable() });
export type Campaign = z.infer<typeof campaignSchema>;

export const greetingConfigSchema = z.object({
  rules: z.array(z.object({ type: z.enum(RULE_TYPES), enabled: z.boolean() })).length(9),
  events: z.array(eventSchema).max(200),
  variants: z.array(variantSchema).max(100),
  campaign: campaignSchema.nullable(),
});
export type GreetingConfig = z.infer<typeof greetingConfigSchema>;

/* ---------- seeds ---------- */
const ev = (id: string, kind: GEvent["kind"], name: string, template: string, mood: string, rule: DateRule, o: Partial<GEvent> = {}): GEvent =>
  ({ id, kind, name, template, mood, rule, leadDays: kind === "marketing" ? 14 : 0, regions: ["GLOBAL"], category: null, brand: null, active: true, ...o });
const CD = "**{event}** is {when}.";
const FD = "Happy **{event}**.";
const fixed = (month: number, day: number): DateRule => ({ kind: "fixed", month, day });
const yrs = (list: [number, number, number][]): DateRule => ({ kind: "explicit", dates: list.map(([year, month, day]) => ({ year, month, day })) });

export const SEED_EVENTS: GEvent[] = [
  ev("valentines", "marketing", "Valentine's", "**Valentine's** is {when}.", "romantic", fixed(2, 14)),
  ev("womens-day", "marketing", "Women's Day", CD, "empowering", fixed(3, 8)),
  ev("earth-day", "marketing", "Earth Day", CD, "natural", fixed(4, 22)),
  ev("mothers-day", "marketing", "Mother's Day", CD, "heartfelt", { kind: "nth", month: 5, weekday: 0, n: 2 }, { regions: ["US", "CA", "AU"] }),
  ev("mothering-sunday", "marketing", "Mother's Day", CD, "heartfelt", yrs([[2026, 3, 15], [2027, 3, 7], [2028, 3, 26], [2029, 3, 11], [2030, 3, 31]]), { regions: ["GB", "IE"] }),
  ev("fathers-day", "marketing", "Father's Day", CD, "warm", { kind: "nth", month: 6, weekday: 0, n: 3 }, { regions: ["US", "GB", "CA"] }),
  ev("back-to-school", "marketing", "Back to school", "**Back to school** {when}.", "cheerful", yrs([[2026, 8, 15], [2027, 8, 15], [2028, 8, 15]]), { regions: ["US"] }),
  ev("halloween", "marketing", "Halloween", CD, "mysterious", fixed(10, 31)),
  ev("singles-day", "marketing", "Singles' Day", CD, "bold", fixed(11, 11)),
  ev("thanksgiving", "marketing", "Thanksgiving", CD, "warm", { kind: "nth", month: 11, weekday: 4, n: 4 }, { regions: ["US"], active: false }),
  ev("black-friday", "marketing", "Black Friday", CD, "urgent", { kind: "offset", eventId: "thanksgiving", days: 1 }),
  ev("small-biz-sat", "marketing", "Shop Small", CD, "human", { kind: "offset", eventId: "thanksgiving", days: 2 }, { regions: ["US"] }),
  ev("cyber-monday", "marketing", "Cyber Monday", CD, "punchy", { kind: "offset", eventId: "thanksgiving", days: 4 }),
  ev("giving-tuesday", "marketing", "Giving Tuesday", CD, "hopeful", { kind: "offset", eventId: "thanksgiving", days: 5 }, { category: "Nonprofit & Causes" }),
  ev("holiday-gifting", "marketing", "Holiday gifting", "**Holiday gifting** starts now.", "festive", fixed(12, 1), { leadDays: 0 }),
  ev("christmas", "marketing", "Christmas", CD, "festive", fixed(12, 25)),
  ev("nye", "marketing", "New Year's Eve", CD, "celebratory", fixed(12, 31)),
  ev("lunar-new-year", "marketing", "Lunar New Year", CD, "celebratory", yrs([[2026, 2, 17], [2027, 2, 6], [2028, 1, 26], [2029, 2, 13], [2030, 2, 3]])),
  ev("coffee-day", "fun_day", "International Coffee Day", FD, "warm", fixed(10, 1), { category: "Food & Drink" }),
  ev("chocolate-day", "fun_day", "National Chocolate Day", FD, "indulgent", fixed(10, 28), { regions: ["US"], brand: "Vosges Haut-Chocolat" }),
  ev("wine-day", "fun_day", "National Wine Day", FD, "elegant", fixed(5, 25), { regions: ["US"], category: "Wine & Spirits" }),
  ev("yoga-day", "fun_day", "International Day of Yoga", FD, "serene", fixed(6, 21), { category: "Health & Wellness" }),
  ev("photo-day", "fun_day", "World Photography Day", FD, "cinematic", fixed(8, 19), { category: "Photography & Visual Arts" }),
  ev("cat-day", "fun_day", "International Cat Day", FD, "playful", fixed(8, 8), { category: "Pets" }),
  ev("dog-day", "fun_day", "International Dog Day", FD, "playful", fixed(8, 26), { category: "Pets" }),
  ev("knitting-month", "fun_day", "National Knitting Month", "**Knitting** month.", "cozy", { kind: "month", month: 11 }, { category: "Crafts & Hobbies" }),
];

const va = (ruleType: Variant["ruleType"], key: string, template: string, mood: string): Variant => ({ id: `${ruleType}-${key}`, ruleType, key, template, mood, active: true });
export const SEED_VARIANTS: Variant[] = [
  va("weather", "clear-day", "Sunny **{day}**.", "sunny"),
  va("weather", "clear-evening", "**Clear skies** tonight.", "dreamy"),
  va("weather", "rain", "Rainy **{day}**.", "cozy"),
  va("weather", "snow", "**Snow day**.", "homey"),
  va("weather", "fog", "Foggy **{day}**.", "mysterious"),
  va("weather", "storm", "**Stormy** out there.", "dramatic"),
  va("weather", "hot", "**Hot one** today.", "fresh"),
  va("weather", "cold", "**Cold one** today.", "warm"),
  va("time_of_day", "morning", "Good **morning**.", "fresh"),
  va("time_of_day", "lunch", "**Lunch break**?", "punchy"),
  va("time_of_day", "golden", "**Golden hour**.", "warm"),
  va("time_of_day", "late", "**Late night** scrolling?", "moody"),
  va("day_of_week", "monday", "**Monday** reset.", "clean"),
  va("day_of_week", "friday", "**Friday** feeling.", "fun"),
  va("day_of_week", "saturday", "**Saturday** mood.", "playful"),
  va("day_of_week", "sunday", "**Sunday** slow.", "serene"),
  va("season", "spring", "First day of **spring**.", "fresh"),
  va("season", "summer", "**Longest day** of the year.", "vibrant"),
  va("season", "autumn", "First day of **autumn**.", "earthy"),
  va("season", "winter", "First day of **winter**.", "cozy"),
];

export const VARIANT_KEYS: Record<Variant["ruleType"], string[]> = {
  weather: ["clear-day", "clear-evening", "rain", "snow", "fog", "storm", "hot", "cold"],
  time_of_day: ["morning", "lunch", "golden", "late"],
  day_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  season: ["spring", "summer", "autumn", "winter"],
};

export const DEFAULT_GREETING: GreetingConfig = {
  rules: RULE_TYPES.map((type) => ({ type, enabled: true })),
  events: SEED_EVENTS,
  variants: SEED_VARIANTS,
  campaign: null,
};

export function mergeGreeting(raw: unknown): GreetingConfig {
  const p = greetingConfigSchema.safeParse(raw);
  if (!p.success) return DEFAULT_GREETING;
  // Fallback is always last and always on.
  const rules = p.data.rules.filter((r) => r.type !== "fallback").concat({ type: "fallback", enabled: true });
  return { ...p.data, rules };
}

/* ---------- dates ---------- */
const DAY_MS = 86400000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  if (n === -1) {
    const last = new Date(year, month, 0);
    return new Date(year, month - 1, last.getDate() - ((last.getDay() - weekday + 7) % 7));
  }
  const first = new Date(year, month - 1, 1);
  return new Date(year, month - 1, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
}

/** The event's date in a given year (null if it has none that year). Month-long events return the 1st. */
export function occurrenceIn(e: GEvent, year: number, all: GEvent[], depth = 0): Date | null {
  const r = e.rule;
  switch (r.kind) {
    case "fixed": return new Date(year, r.month - 1, r.day);
    case "month": return new Date(year, r.month - 1, 1);
    case "nth": return nthWeekday(year, r.month, r.weekday, r.n);
    case "explicit": { const d = r.dates.find((x) => x.year === year); return d ? new Date(year, d.month - 1, d.day) : null; }
    case "offset": {
      const base = all.find((x) => x.id === r.eventId);
      if (!base || depth > 4) return null;
      const b = occurrenceIn(base, year, all, depth + 1);
      return b ? new Date(b.getFullYear(), b.getMonth(), b.getDate() + r.days) : null;
    }
  }
}

/** Next date on/after today (for month-long events: today if inside the month). */
export function nextOccurrence(e: GEvent, today: Date, all: GEvent[]): Date | null {
  const t = startOfDay(today);
  if (e.rule.kind === "month" && t.getMonth() === e.rule.month - 1) return t;
  for (const y of [t.getFullYear(), t.getFullYear() + 1]) {
    const d = occurrenceIn(e, y, all);
    if (d && d >= t) return d;
  }
  return null;
}

const SOUTH = new Set(["AU", "NZ", "ZA", "AR", "CL", "BR", "UY", "PY", "BO", "PE", "NA", "BW", "LS", "MZ", "MG", "ZW", "FJ"]);
function seasonToday(d: Date, country: string | null): string | null {
  const m = d.getMonth() + 1, day = d.getDate();
  const north = [[3, 20, "spring"], [6, 21, "summer"], [9, 22, "autumn"], [12, 21, "winter"]] as const;
  const hit = north.find(([mm, dd]) => mm === m && dd === day);
  if (!hit) return null;
  if (!country || !SOUTH.has(country)) return hit[2];
  return ({ spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" } as const)[hit[2]];
}

/* ---------- templates ---------- */
export type Segment = { text: string; bold: boolean };
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export type Tokens = { day: string; days?: number | undefined; event?: string | undefined; city?: string | null | undefined; brand?: string | null | undefined; count?: number | undefined };

export function whenText(days: number) { return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`; }

export function fillTemplate(tpl: string, t: Tokens): string {
  return tpl
    .replace(/\{day\}/g, t.day)
    .replace(/\{days\}/g, String(t.days ?? ""))
    .replace(/\{when\}/g, whenText(t.days ?? 0))
    .replace(/\{event\}/g, t.event ?? "")
    .replace(/\{city\}/g, t.city ?? "")
    .replace(/\{brand\}/g, t.brand ?? "")
    .replace(/\{count\}/g, String(t.count ?? ""))
    .replace(/\s+/g, " ").trim();
}
export const plainText = (filled: string) => filled.replace(/\*\*/g, "");
export function toSegments(filled: string): Segment[] {
  return filled.split("**").map((text, i) => ({ text, bold: i % 2 === 1 })).filter((s) => s.text);
}
/** Longest plausible fill, used by the admin length check. */
export const worstCaseLength = (tpl: string) => plainText(fillTemplate(tpl, { day: "Wednesday", days: 14, event: "", city: "San Francisco", brand: "Brand name", count: 999 })).length;

/* ---------- chooser ---------- */
export type WeatherKind = "clear" | "cloudy" | "rain" | "snow" | "fog" | "storm";
export type GreetingCtx = {
  now: Date;
  country: string | null;
  city: string | null;
  weather: { kind: WeatherKind; tempC: number; isDay: boolean; sunset: string | null } | null;
  returningMood: string | null;
  /** Whether a linked category/brand has published reels. */
  hasReels: (category: string | null, brand: string | null) => boolean;
  fallbackMood: string;
  count?: number;
};
export type Chosen = { rule: RuleType; source: string; filled: string; segments: Segment[]; mood: string; category: string | null; brand: string | null };

const inRegion = (e: GEvent, country: string | null) => e.regions.includes("GLOBAL") || (!!country && e.regions.includes(country));

function weatherKey(w: NonNullable<GreetingCtx["weather"]>): string | null {
  if (w.kind === "storm") return "storm";
  if (w.kind === "snow") return "snow";
  if (w.kind === "rain") return "rain";
  if (w.kind === "fog") return "fog";
  if (w.tempC > 28) return "hot";
  if (w.tempC < 3) return "cold";
  if (w.kind === "clear") return w.isDay ? "clear-day" : "clear-evening";
  return null; // plain cloudy isn't notable
}

function timeKey(now: Date, sunset: string | null): string | null {
  const h = now.getHours();
  if (sunset) {
    const s = new Date(sunset).getTime(), n = now.getTime();
    if (n <= s && s - n <= 3600000) return "golden";
  }
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 21 || h < 2) return "late";
  return null;
}

export function chooseGreeting(cfg: GreetingConfig, ctx: GreetingCtx): Chosen {
  const day = WEEKDAYS[ctx.now.getDay()]!;
  const base: Tokens = { day, city: ctx.city, count: ctx.count };
  const make = (rule: RuleType, source: string, tpl: string, mood: string, tokens: Partial<Tokens> = {}, category: string | null = null, brand: string | null = null): Chosen => {
    const filled = fillTemplate(tpl, { ...base, brand, ...tokens });
    return { rule, source, filled, segments: toSegments(filled), mood, category, brand };
  };
  const variant = (type: Variant["ruleType"], key: string | null) => (key ? cfg.variants.find((v) => v.active && v.ruleType === type && v.key === key) : undefined);
  const events = cfg.events;

  for (const r of cfg.rules) {
    if (!r.enabled && r.type !== "fallback") continue;
    switch (r.type) {
      case "campaign": {
        const c = cfg.campaign;
        if (c && c.template && campaignStatus(c, ctx.now) === "live") return make("campaign", "Campaign", c.template, c.mood, {}, c.category, c.brand);
        break;
      }
      case "countdown": {
        let best: { e: GEvent; days: number } | null = null;
        for (const e of events) {
          if (!e.active || e.kind !== "marketing" || !inRegion(e, ctx.country)) continue;
          const d = nextOccurrence(e, ctx.now, events);
          if (!d) continue;
          const days = daysBetween(ctx.now, d);
          if (days >= 0 && days <= e.leadDays && (!best || days < best.days)) best = { e, days };
        }
        if (best) return make("countdown", `Countdown — ${best.e.name}`, best.e.template, best.e.mood, { days: best.days, event: best.e.name }, best.e.category, best.e.brand);
        break;
      }
      case "fun_day": {
        for (const e of events) {
          if (!e.active || e.kind !== "fun_day" || !inRegion(e, ctx.country)) continue;
          const d = nextOccurrence(e, ctx.now, events);
          if (!d || daysBetween(ctx.now, d) !== 0) continue;
          if ((e.category || e.brand) && !ctx.hasReels(e.category, e.brand)) continue;
          return make("fun_day", `Fun day — ${e.name}`, e.template, e.mood, { event: e.name }, e.category, e.brand);
        }
        break;
      }
      case "weather": {
        const v = ctx.weather ? variant("weather", weatherKey(ctx.weather)) : undefined;
        if (v) return make("weather", `Weather — ${v.key}`, v.template, v.mood);
        break;
      }
      case "season": {
        const v = variant("season", seasonToday(ctx.now, ctx.country));
        if (v) return make("season", `Season — ${v.key}`, v.template, v.mood);
        break;
      }
      case "returning":
        if (ctx.returningMood) return make("returning", "Returning visitor", "Welcome **back**.", ctx.returningMood);
        break;
      case "time_of_day": {
        const v = variant("time_of_day", timeKey(ctx.now, ctx.weather?.sunset ?? null));
        if (v) return make("time_of_day", `Time of day — ${v.key}`, v.template, v.mood);
        break;
      }
      case "day_of_week": {
        const v = variant("day_of_week", day.toLowerCase());
        if (v) return make("day_of_week", `Day of week — ${day}`, v.template, v.mood);
        break;
      }
      case "fallback":
        return make("fallback", "Fallback", "Happy **{day}**.", ctx.fallbackMood);
    }
  }
  return make("fallback", "Fallback", "Happy **{day}**.", ctx.fallbackMood);
}

export function campaignStatus(c: Campaign, now: Date): "live" | "scheduled" | "ended" {
  const s = c.startsAt ? new Date(c.startsAt).getTime() : -Infinity;
  const e = c.endsAt ? new Date(c.endsAt).getTime() : Infinity;
  const n = now.getTime();
  return n < s ? "scheduled" : n > e ? "ended" : "live";
}

/* ---------- returning visitor (localStorage only) ---------- */
const VISIT_KEY = "gp_dir_visit";
export function readReturning(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(VISIT_KEY) ?? "null") as { mood?: string; at?: number } | null;
    if (v?.mood && v.at && Date.now() - v.at > 12 * 3600000) return v.mood;
  } catch { /* ignore */ }
  return null;
}
export function rememberVisit(mood?: string) {
  try {
    const prev = JSON.parse(localStorage.getItem(VISIT_KEY) ?? "null") as { mood?: string } | null;
    localStorage.setItem(VISIT_KEY, JSON.stringify({ mood: mood ?? prev?.mood, at: Date.now() }));
  } catch { /* ignore */ }
}
