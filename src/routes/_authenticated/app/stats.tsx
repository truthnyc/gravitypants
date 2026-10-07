import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { getBrandStats } from "@/lib/directory/brand-stats.functions";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import type { StatRow } from "@/lib/directory/brand-stats";

export const Route = createFileRoute("/_authenticated/app/stats")({
  head: () => ({
    meta: [
      { title: "Brand stats — Gravity Pants" },
      { name: "description", content: "Views, saves and website clicks for your reels, and which moods work best." },
      { property: "og:title", content: "Brand stats — Gravity Pants" },
      { property: "og:description", content: "See which reels and moods bring shoppers to your website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

const RANGES = [7, 30, 90] as const;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const change = (a: number, b: number) => (b === 0 ? (a > 0 ? "New" : "—") : `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%`);

function StatsPage() {
  const { canUse, isLoading } = usePlanAccess();
  const allowed = canUse("brand_stats");
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [brandId, setBrandId] = useState<string | null>(null);
  const fetchStats = useServerFn(getBrandStats);
  const q = useQuery({
    queryKey: ["brand-stats", getWorkspaceId(), days, brandId],
    enabled: !isLoading && allowed,
    queryFn: () => fetchStats({ data: { workspaceId: getWorkspaceId(), days, brandId } }),
  });
  const s = q.data && q.data.allowed ? q.data : null;

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-10 font-ap text-ap-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.035em]">Brand stats</h1>
          <p className="mt-1 text-[15px] text-ap-muted">How shoppers respond to your reels on Aimanté and Gravity Pants.</p>
        </div>
        {allowed && (
          <div className="flex flex-wrap items-center gap-2">
            {s && s.brands.length > 1 && (
              <select aria-label="Brand" value={brandId ?? ""} onChange={(e) => setBrandId(e.target.value || null)} className="h-9 rounded-lg border border-ap-hairline bg-ap-card px-3 text-[14px]">
                <option value="">All brands</option>
                {s.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <div className="flex rounded-lg bg-ap-panel p-0.5" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <button key={r} type="button" onClick={() => setDays(r)} aria-pressed={days === r} className={`rounded-lg px-3 py-1.5 text-[13px] tabular-nums ${days === r ? "bg-ap-card font-semibold shadow-ap-soft" : "text-ap-muted"}`}>{r} days</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isLoading && !allowed && (
        <section className="mt-10 rounded border border-ap-hairline bg-ap-card p-8 text-center">
          <h2 className="text-[20px] font-semibold">Brand stats come with Business and Team</h2>
          <p className="mx-auto mt-2 max-w-[460px] text-[15px] text-ap-muted">See views, saves and website clicks for every reel, and which moods bring shoppers to your site.</p>
          <Button className="mt-5" onClick={() => openUpgrade("brand_stats")}>Upgrade</Button>
        </section>
      )}

      {allowed && q.isLoading && <p className="mt-10 text-[15px] text-ap-muted">Loading your stats…</p>}
      {allowed && q.isError && <p className="mt-10 text-[15px] text-ap-muted">Stats couldn't load. Try again in a moment.</p>}

      {s && (
        s.brands.length === 0 || s.totals.views + s.totals.saves + s.totals.clicks === 0 ? (
          <p className="mt-10 rounded border border-ap-hairline bg-ap-card p-8 text-center text-[15px] text-ap-muted">Your stats start as soon as shoppers open your reels.</p>
        ) : (
          <>
            {s.tip && <p className="mt-8 rounded bg-ap-soft-blue px-4 py-3 text-[15px]">{s.tip}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Views" value={s.totals.views} delta={change(s.totals.views, s.previous.views)} />
              <Kpi label="Saves" value={s.totals.saves} delta={change(s.totals.saves, s.previous.saves)} />
              <Kpi label="Website clicks" value={s.totals.clicks} delta={change(s.totals.clicks, s.previous.clicks)} />
              <Kpi label="Click rate" value={pct(s.totals.views ? s.totals.clicks / s.totals.views : 0)} />
            </div>
            <section className="mt-6 h-[260px] rounded border border-ap-hairline bg-ap-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.days}>
                  <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={12} stroke="var(--ap-muted, currentColor)" />
                  <YAxis allowDecimals={false} fontSize={12} width={32} stroke="var(--ap-muted, currentColor)" />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" name="Views" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="saves" name="Saves" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </section>
            <Table title="Top reels" rows={s.reels} />
            <div className="grid gap-6 lg:grid-cols-2">
              <Table title="Moods" rows={s.moods} />
              <Table title="Formats" rows={s.formats} />
            </div>
          </>
        )
      )}
    </main>
  );
}

function Kpi({ label, value, delta }: { label: string; value: number | string; delta?: string }) {
  return (
    <div className="rounded border border-ap-hairline bg-ap-card p-4">
      <p className="text-[13px] text-ap-muted">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tabular-nums">{value}</p>
      {delta && <p className="text-[12px] tabular-nums text-ap-muted">{delta} vs previous period</p>}
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: StatRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="mt-6 overflow-x-auto rounded border border-ap-hairline bg-ap-card">
      <h2 className="px-4 pt-4 text-[17px] font-semibold">{title}</h2>
      <table className="mt-2 w-full text-[14px]">
        <thead className="text-left text-[12px] text-ap-muted">
          <tr><th className="px-4 py-2 font-normal">Name</th><th className="px-2 py-2 text-right font-normal">Views</th><th className="px-2 py-2 text-right font-normal">Saves</th><th className="px-2 py-2 text-right font-normal">Clicks</th><th className="px-4 py-2 text-right font-normal">Click rate</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-ap-hairline tabular-nums">
              <td className="px-4 py-2 capitalize">{r.name}</td><td className="px-2 py-2 text-right">{r.views}</td><td className="px-2 py-2 text-right">{r.saves}</td><td className="px-2 py-2 text-right">{r.clicks}</td><td className="px-4 py-2 text-right">{pct(r.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
