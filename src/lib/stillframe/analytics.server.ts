/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only analytics aggregation shared by admin functions and the weekly email.

const day = (s: string) => s.slice(0, 10);

async function allUsers(db: any) {
  const out: any[] = [];
  for (let page = 1; page < 50; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    out.push(...users);
    if (users.length < 1000) break;
  }
  return out;
}

async function pageViews(db: any, since: string, until: string) {
  const rows: any[] = [];
  for (let from = 0; from < 500000; from += 1000) {
    const { data } = await db.from("page_views").select("visitor_id, session_id, path, referrer, utm_source, utm_campaign, device, created_at")
      .gte("created_at", since).lt("created_at", until).order("created_at").range(from, from + 999);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

const top = (m: Map<string, number>, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

export async function computeAnalytics(db: any, sinceIso: string, untilIso: string) {
  const [views, users, { data: ws }, { data: usage }, { data: bills }, { data: plans }] = await Promise.all([
    pageViews(db, sinceIso, untilIso),
    allUsers(db),
    db.from("workspaces").select("id, owner_id"),
    db.from("export_usage").select("workspace_id, created_at"),
    db.from("workspace_billing").select("workspace_id, plan, status, comp_plan, comp_until, created_at, updated_at, cancel_at_period_end"),
    db.from("plans").select("id, name, amount_cents, interval"),
  ]);
  const inRange = (s: string) => s >= sinceIso && s < untilIso;

  // Traffic
  const sessions = new Map<string, number>();
  const daily = new Map<string, { views: number; visitors: Set<string> }>();
  const pages = new Map<string, number>(), refs = new Map<string, number>(), devices = new Map<string, number>();
  for (const v of views) {
    bump(sessions, v.session_id);
    const d = daily.get(day(v.created_at)) ?? { views: 0, visitors: new Set() };
    d.views++; d.visitors.add(v.visitor_id); daily.set(day(v.created_at), d);
    bump(pages, v.path); bump(refs, v.referrer || "Direct"); bump(devices, v.device || "unknown");
  }
  const visitors = new Set(views.map((v) => v.visitor_id)).size;
  const bounce = sessions.size ? [...sessions.values()].filter((n) => n === 1).length / sessions.size : 0;

  // Funnel
  const signups = users.filter((u) => inRange(u.created_at));
  const signupIds = new Set(signups.map((u) => u.id));
  const ownerWs = new Map<string, string>(((ws ?? []) as any[]).map((w) => [w.owner_id, w.id]));
  const firstExport = new Map<string, string>();
  for (const e of (usage ?? []) as any[]) {
    const cur = firstExport.get(e.workspace_id);
    if (!cur || e.created_at < cur) firstExport.set(e.workspace_id, e.created_at);
  }
  const billBy = new Map(((bills ?? []) as any[]).map((b) => [b.workspace_id, b]));
  const planBy = new Map(((plans ?? []) as any[]).map((p) => [p.id, p]));
  const isPaid = (b: any) => b && !["trial", "none"].includes(b.plan) && ["active", "past_due"].includes(b.status);
  let exported = 0, paid = 0;
  const attribution = new Map<string, { signups: number; paid: number }>();
  for (const u of signups) {
    const w = ownerWs.get(u.id);
    const didExport = !!(w && firstExport.get(w));
    const didPay = !!(w && isPaid(billBy.get(w)));
    if (didExport) exported++;
    if (didPay) paid++;
    const t = u.user_metadata?.first_touch ?? {};
    const key = `${t.source || t.referrer || "Direct"}|${t.campaign || "—"}`;
    const a = attribution.get(key) ?? { signups: 0, paid: 0 };
    a.signups++; if (didPay) a.paid++; attribution.set(key, a);
  }

  // Revenue
  let mrr = 0; const mix = new Map<string, number>(); let newPaid = 0, canceled = 0;
  for (const b of (bills ?? []) as any[]) {
    if (b.status === "canceled" && inRange(b.updated_at)) canceled++;
    if (!isPaid(b)) continue;
    const p: any = planBy.get(b.plan);
    if (p) mrr += p.interval === "year" ? p.amount_cents / 12 : p.amount_cents;
    bump(mix, p?.name ?? b.plan);
    if (inRange(b.updated_at)) newPaid++;
  }

  const days: { day: string; views: number; visitors: number; signups: number; exports: number }[] = [];
  for (let t = new Date(sinceIso).getTime(); t < new Date(untilIso).getTime(); t += 86400000) {
    const k = new Date(t).toISOString().slice(0, 10);
    days.push({
      day: k, views: daily.get(k)?.views ?? 0, visitors: daily.get(k)?.visitors.size ?? 0,
      signups: signups.filter((u) => day(u.created_at) === k).length,
      exports: ((usage ?? []) as any[]).filter((e) => day(e.created_at) === k).length,
    });
  }

  return {
    traffic: {
      views: views.length, visitors, sessions: sessions.size, bounceRate: bounce,
      topPages: top(pages), topReferrers: top(refs), devices: top(devices),
    },
    funnel: { visitors, signups: signups.length, exported, paid, signupIds: signupIds.size },
    marketing: [...attribution.entries()].map(([k, v]) => {
      const [source, campaign] = k.split("|");
      return { source: source!, campaign: campaign!, ...v };
    }).sort((a, b) => b.signups - a.signups),
    revenue: { mrrCents: Math.round(mrr), newPaid, canceled, mix: top(mix, 20) },
    exports: ((usage ?? []) as any[]).filter((e) => inRange(e.created_at)).length,
    days,
  };
}

// ---- Google Search Console ----
const GSC = "https://connector-gateway.lovable.dev/google_search_console";
const TARGET = "https://gravitypants.com/";

function gscHeaders() {
  const a = process.env["LOVABLE_API_KEY"], c = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
  if (!a || !c) return null;
  return { Authorization: `Bearer ${a}`, "X-Connection-Api-Key": c };
}

function covers(siteUrl: string, target: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const d = siteUrl.slice(10).toLowerCase(), h = target.hostname.toLowerCase();
    return h === d || h.endsWith(`.${d}`);
  }
  try { return target.href.startsWith(new URL(siteUrl).href); } catch { return false; }
}

export type SearchResult =
  | { status: "unavailable"; message: string }
  | { status: "selection_required"; candidates: string[] }
  | { status: "ok"; siteUrl: string; totals: { clicks: number; impressions: number; ctr: number; position: number }; queries: any[]; pages: any[]; days: any[]; indexed: string | null };

export async function searchReport(selected?: string): Promise<SearchResult> {
  const headers = gscHeaders();
  if (!headers) return { status: "unavailable", message: "Google Search Console isn't connected." };
  const r = await fetch(`${GSC}/webmasters/v3/sites`, { headers });
  if (!r.ok) { console.error("GSC sites", r.status, await r.text()); return { status: "unavailable", message: `Couldn't reach Search Console (${r.status}).` }; }
  const { siteEntry = [] } = (await r.json()) as { siteEntry?: { siteUrl: string; permissionLevel?: string }[] };
  const matches = siteEntry.filter((e) => e.permissionLevel !== "siteUnverifiedUser" && (covers(e.siteUrl, new URL(TARGET)) || covers(e.siteUrl, new URL("https://www.gravitypants.com/"))));
  let siteUrl: string;
  if (selected) {
    const m = matches.find((e) => e.siteUrl === selected);
    if (!m) return { status: "selection_required", candidates: matches.map((e) => e.siteUrl) };
    siteUrl = m.siteUrl;
  } else if (matches.length === 1) siteUrl = matches[0]!.siteUrl;
  else if (matches.length === 0) return { status: "unavailable", message: "No verified Search Console property covers gravitypants.com in the connected Google account." };
  else return { status: "selection_required", candidates: matches.map((e) => e.siteUrl) };

  const end = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const q = async (body: object) => {
    const res = await fetch(`${GSC}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: start, endDate: end, ...body }),
    });
    if (!res.ok) throw new Error(`Search Console ${res.status}: ${await res.text()}`);
    return ((await res.json()) as any).rows ?? [];
  };
  try {
    const [tot, queries, pages, days] = await Promise.all([q({}), q({ dimensions: ["query"], rowLimit: 25 }), q({ dimensions: ["page"], rowLimit: 25 }), q({ dimensions: ["date"] })]);
    let indexed: string | null = null;
    try {
      const ins = await fetch(`${GSC}/v1/urlInspection/index:inspect`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ inspectionUrl: TARGET, siteUrl }) });
      if (ins.ok) indexed = ((await ins.json()) as any)?.inspectionResult?.indexStatusResult?.coverageState ?? null;
    } catch { /* optional */ }
    const t = tot[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    return {
      status: "ok", siteUrl, indexed,
      totals: { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position },
      queries: queries.map((r: any) => ({ name: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      pages: pages.map((r: any) => ({ name: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      days: days.map((r: any) => ({ day: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
    };
  } catch (e) {
    console.error(e);
    return { status: "unavailable", message: e instanceof Error && e.message.includes("403") ? "The connected Google account can't access this property." : "Search Console data is unavailable right now." };
  }
}
