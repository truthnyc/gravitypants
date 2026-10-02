import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Download } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, fmtMoney, PageTitle } from "@/components/admin/AdminShell";
import { newsletterStats } from "@/lib/site/newsletter-stats.functions";
import { adminAnalytics, adminSearch, getReportPrefs, setReportPrefs } from "@/lib/stillframe/admin-analytics.functions";

const TABS = ["traffic", "funnel", "search", "marketing", "revenue", "newsletter"] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { traffic: "Traffic", funnel: "Funnel", search: "Google Search", marketing: "Marketing", revenue: "Revenue", newsletter: "Newsletter" };

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  validateSearch: (s) => z.object({ tab: z.enum(TABS).catch("traffic") }).parse(s),
  head: () => ({ meta: [
    { title: "Admin Analytics — Gravity Pants" },
    { name: "description", content: "Private traffic, conversion, search and revenue reports." },
    { property: "og:title", content: "Admin Analytics — Gravity Pants" },
    { property: "og:description", content: "Private traffic, conversion, search and revenue reports." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Analytics,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ago = (n: number) => iso(new Date(Date.now() - n * 86400000));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function csv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob([[keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${name}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

function Analytics() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [from, setFrom] = useState(ago(29));
  const [to, setTo] = useState(ago(0));
  const fn = useServerFn(adminAnalytics);
  const { data, error } = useQuery({ queryKey: ["admin", "analytics", from, to], queryFn: () => fn({ data: { from, to } }), enabled: tab !== "search" && tab !== "newsletter" });

  return (
    <>
      <PageTitle title="Analytics" sub="Traffic, conversion, search and revenue." right={<WeeklyToggle />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" className="flex gap-1 rounded-lg bg-control-fill p-1">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => navigate({ search: { tab: t } })}
              className={`h-8 rounded-lg px-3 text-[13px] font-medium ${tab === t ? "bg-card shadow-card" : "text-secondary-text"}`}>{LABEL[t]}</button>
          ))}
        </div>
        {tab !== "search" && tab !== "newsletter" && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {[7, 30, 90].map((n) => (
              <button key={n} onClick={() => { setFrom(ago(n - 1)); setTo(ago(0)); }} className="h-8 rounded-lg px-3 text-[13px] text-primary hover:bg-control-fill">{n} days</button>
            ))}
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[150px] bg-card" aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[150px] bg-card" aria-label="To date" />
          </div>
        )}
      </div>
      {tab === "search" ? <SearchTab /> : tab === "newsletter" ? <NewsletterTab /> : error ? <p className="text-destructive">Couldn't load analytics.</p> : !data ? <div aria-busy="true" className="h-96" /> : (
        <>
          {tab === "traffic" && (
            <>
              <Stats items={[["Visitors", data.traffic.visitors], ["Page views", data.traffic.views], ["Visits", data.traffic.sessions], ["Bounce rate", pct(data.traffic.bounceRate)]]} />
              <Chart data={data.days} lines={[["visitors", "Visitors"], ["views", "Page views"]]} />
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TopList title="Top pages" rows={data.traffic.topPages} />
                <TopList title="Where visitors came from" rows={data.traffic.topReferrers} />
                <TopList title="Devices" rows={data.traffic.devices} />
              </div>
            </>
          )}
          {tab === "funnel" && <Funnel f={data.funnel} days={data.days} />}
          {tab === "marketing" && (
            <Card className="p-0">
              <TableHead title="Sign-ups by source and campaign" onCsv={() => csv("marketing", data.marketing)} />
              <Table cols={["Source", "Campaign", "Sign-ups", "Paid", "Conversion"]}
                rows={data.marketing.map((m) => [m.source, m.campaign, m.signups, m.paid, pct(m.signups ? m.paid / m.signups : 0)])}
                empty="No sign-ups in this period. Add utm_source and utm_campaign to your ad links to see campaigns here." />
              <p className="px-4 pb-4 text-[13px] text-secondary-text">Ad spend appears here once Google Ads or Meta Ads is connected.</p>
            </Card>
          )}
          {tab === "revenue" && (
            <>
              <Stats items={[["Monthly recurring revenue", fmtMoney(data.revenue.mrrCents)], ["New paid plans", data.revenue.newPaid], ["Cancelled", data.revenue.canceled], ["Exports", data.exports]]} />
              <div className="mt-4"><TopList title="Plan mix (paying clients)" rows={data.revenue.mix} /></div>
            </>
          )}
        </>
      )}
    </>
  );
}

function WeeklyToggle() {
  const get = useServerFn(getReportPrefs), set = useServerFn(setReportPrefs);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "report-prefs"], queryFn: () => get() });
  const m = useMutation({ mutationFn: (v: boolean) => set({ data: { weeklyEmail: v } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "report-prefs"] }) });
  return (
    <label className="flex items-center gap-2 text-[14px]">
      <Switch checked={data?.weeklyEmail ?? true} disabled={!data || m.isPending} onCheckedChange={(v) => m.mutate(v)} />
      Weekly email on Mondays
    </label>
  );
}

function Stats({ items }: { items: readonly (readonly [string, string | number])[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(([l, v]) => (
        <Card key={l}><div className="text-[13px] text-secondary-text">{l}</div><div className="mt-1 text-[28px] font-bold nums tracking-[-0.02em]">{typeof v === "number" ? v.toLocaleString() : v}</div></Card>
      ))}
    </div>
  );
}

function Chart({ data, lines, x = "day" }: { data: Record<string, unknown>[]; lines: [string, string][]; x?: string }) {
  const colors = ["var(--primary)", "var(--foreground)"];
  return (
    <Card className="mt-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey={x} tickFormatter={(d: string) => d.slice(5)} fontSize={12} stroke="var(--secondary-text)" />
            <YAxis allowDecimals={false} fontSize={12} stroke="var(--secondary-text)" width={40} />
            <Tooltip /><Legend />
            {lines.map(([k, n], i) => <Line key={k} type="monotone" dataKey={k} name={n} stroke={colors[i]} strokeWidth={2} dot={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function TableHead({ title, onCsv }: { title: string; onCsv: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <button onClick={onCsv} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] text-primary hover:bg-control-fill">
        <Download className="size-4" strokeWidth={1.7} /> CSV
      </button>
    </div>
  );
}

function Table({ cols, rows, empty }: { cols: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <table className="mt-2 w-full text-left text-[13px]">
      <thead className="text-secondary-text"><tr className="hairline-b">{cols.map((c) => <th key={c} className="px-4 py-2 font-medium">{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i} className="hairline-b last:border-0">{r.map((v, j) => <td key={j} className={`px-4 py-2 ${typeof v === "number" ? "nums" : "break-all"}`}>{typeof v === "number" ? v.toLocaleString() : v}</td>)}</tr>)}
        {rows.length === 0 && <tr><td colSpan={cols.length} className="px-4 py-6 text-center text-secondary-text">{empty}</td></tr>}
      </tbody>
    </table>
  );
}

function TopList({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <Card className="p-0">
      <TableHead title={title} onCsv={() => csv(title.toLowerCase().replace(/\W+/g, "-"), rows)} />
      <Table cols={["Name", "Count"]} rows={rows.map((r) => [r.name, r.count])} empty="No data yet." />
    </Card>
  );
}

function Funnel({ f, days }: { f: { visitors: number; signups: number; exported: number; paid: number }; days: Record<string, unknown>[] }) {
  const steps = [["Visitors", f.visitors], ["Sign-ups", f.signups], ["Made an export", f.exported], ["Paid plan", f.paid]] as const;
  return (
    <>
      <Card>
        <div className="space-y-3">
          {steps.map(([l, v], i) => {
            const prev = i ? steps[i - 1]![1] : v;
            const w = steps[0][1] ? Math.max(2, (v / Math.max(1, steps[0][1])) * 100) : 2;
            return (
              <div key={l}>
                <div className="mb-1 flex justify-between text-[14px]"><span>{l}</span><span className="nums text-secondary-text">{v.toLocaleString()}{i > 0 && ` · ${pct(prev ? v / prev : 0)} of previous step`}</span></div>
                <div className="h-3 rounded-lg bg-control-fill"><div className="h-3 rounded-lg bg-primary" style={{ width: `${w}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>
      <Chart data={days} lines={[["signups", "Sign-ups"], ["exports", "Exports"]]} />
    </>
  );
}

function SearchTab() {
  const fn = useServerFn(adminSearch);
  const [siteUrl, setSiteUrl] = useState<string | undefined>(() => (typeof window !== "undefined" ? localStorage.getItem("gp_gsc_site") ?? undefined : undefined));
  const { data, error } = useQuery({ queryKey: ["admin", "search", siteUrl], queryFn: () => fn({ data: { siteUrl } }), staleTime: 3600_000 });
  if (error) return <p className="text-destructive">Couldn't load Search Console data.</p>;
  if (!data) return <div aria-busy="true" className="h-96" />;
  if (data.status === "unavailable") return <Card><p className="text-[14px] text-secondary-text">{data.message}</p></Card>;
  if (data.status === "selection_required")
    return (
      <Card>
        <p className="mb-3 text-[14px]">Choose which Search Console property to report on:</p>
        <div className="flex flex-wrap gap-2">
          {data.candidates.map((c) => (
            <button key={c} onClick={() => { localStorage.setItem("gp_gsc_site", c); setSiteUrl(c); }} className="h-9 rounded-lg bg-control-fill px-3 text-[13px]">{c}</button>
          ))}
        </div>
      </Card>
    );
  return (
    <>
      <p className="mb-3 text-[13px] text-secondary-text">Last 28 days · {data.siteUrl}{data.indexed ? ` · Homepage: ${data.indexed}` : ""}</p>
      <Stats items={[["Clicks", data.totals.clicks], ["Impressions", data.totals.impressions], ["Click rate", pct(data.totals.ctr)], ["Average position", data.totals.position.toFixed(1)]]} />
      <Chart data={data.days} lines={[["clicks", "Clicks"], ["impressions", "Impressions"]]} />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {([["Top search phrases", data.queries], ["Top pages", data.pages]] as const).map(([t, rows]) => (
          <Card key={t} className="p-0">
            <TableHead title={t} onCsv={() => csv(t.toLowerCase().replace(/\W+/g, "-"), rows as Record<string, unknown>[])} />
            <Table cols={["Name", "Clicks", "Impressions", "Position"]} rows={rows.map((r: any) => [r.name, r.clicks, r.impressions, Number(r.position.toFixed(1))])} empty="No reported data yet." />
          </Card>
        ))}
      </div>
    </>
  );
}

function NewsletterTab() {
  const fn = useServerFn(newsletterStats);
  const { data, error } = useQuery({ queryKey: ["admin", "newsletter"], queryFn: () => fn(), staleTime: 300_000 });
  if (error) return <p className="text-destructive">Couldn't load newsletter data.</p>;
  if (!data) return <div aria-busy="true" className="h-96" />;
  if (data.status !== "ok") return <Card><p className="text-[14px] text-secondary-text">{data.message}</p></Card>;
  const total = data.confirmed + data.pending;
  return (
    <>
      <p className="mb-3 text-[13px] text-secondary-text">Live from Campaign Monitor · all time</p>
      <Stats items={[["Signed up", total], ["Confirmed", data.confirmed], ["Waiting to confirm", data.pending], ["Confirmation rate", pct(total ? data.confirmed / total : 0)]]} />
      <div className="mt-4"><Stats items={[["New this week", data.week], ["New this month", data.month], ["Unsubscribed", data.unsubscribes], ["Bounced", data.bounces]]} /></div>
      <Card className="mt-4 p-0">
        <TableHead title="Automated emails (opens)" onCsv={() => csv("newsletter-emails", data.emails)} />
        <Table cols={["Journey", "Email", "Sent", "Opened", "Open rate", "Clicked"]}
          rows={data.emails.map((e) => [e.journey, e.name, e.sent, e.uniqueOpened, pct(e.sent ? e.uniqueOpened / e.sent : 0), e.clicked])}
          empty="No automated emails yet. Set up a welcome journey in Campaign Monitor to track opens here." />
        <p className="px-4 pb-4 text-[13px] text-secondary-text">Campaign Monitor doesn't report opens for its built-in confirmation email, so "Confirmed" (people who clicked the confirm link) is the closest measure.</p>
      </Card>
    </>
  );
}
