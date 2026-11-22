import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Download, RefreshCw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from './AdminShell';
import { adminGoogleAdsReport, adminMetaAdsReport } from '@/lib/stillframe/admin-analytics.functions';

export function GoogleAdsTab({ from, to }: { from: string; to: string }) {
  return <AdsReport from={from} to={to} provider="google" />;
}

export function MetaAdsTab({ from, to }: { from: string; to: string }) {
  return <AdsReport from={from} to={to} provider="meta" />;
}

function AdsReport({ from, to, provider }: { from: string; to: string; provider: 'google' | 'meta' }) {
  const google = useServerFn(adminGoogleAdsReport);
  const meta = useServerFn(adminMetaAdsReport);
  const fn = provider === 'google' ? google : meta;
  const brand = provider === 'google' ? 'Google Ads' : 'Facebook Ads';
  const resultLabel = provider === 'google' ? 'Conversions' : 'Landing page views';
  const query = useQuery({ queryKey: ['admin', `${provider}-ads`, from, to], queryFn: () => fn({ data: { from, to } }), staleTime: 300_000, retry: false, enabled: Boolean(from && to && from <= to) });
  const [metric, setMetric] = useState<'clicks' | 'spend' | 'conversions'>('clicks');
  const data = query.data;
  const refresh = <Button variant="ghost" size="sm" aria-label="Refresh Google Ads report" title="Refresh Google Ads report" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`} strokeWidth={1.7} /></Button>;
  if (!from || !to || from > to) return <p role="alert" className="text-sm text-destructive">Choose a valid date range.</p>;
  if (query.error || data?.status === 'unavailable') return <div role="alert" className="flex items-center gap-3"><p className="text-sm text-destructive">{query.error instanceof Error ? query.error.message : data?.status === 'unavailable' ? data.message : `Could not load ${brand}.`}</p>{refresh}</div>;
  if (!data) return <p role="status" className="text-sm text-secondary-text">Loading {brand}…</p>;
  const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: data.account.currency }).format(value);
  const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const exportCsv = () => {
    const rows = [ ['Campaign', 'Status', `Spend (${data.account.currency})`, 'Impressions', 'Clicks', 'CTR', resultLabel, `Cost per result (${data.account.currency})`, 'From', 'To'],
      ...data.campaigns.map(c => [c.name, c.status, c.spend.toFixed(2), c.impressions, c.clicks, percent(c.ctr), c.conversions, c.costPerConversion?.toFixed(2) ?? '', from, to]) ];
    const text = rows.map(row => row.map(value => { let s = String(value); if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${provider}-ads-${from}-${to}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="min-w-0 space-y-5" aria-label={`${brand} performance`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-semibold">{data.account.name}</h2><p className="text-xs text-secondary-text tabular-nums">{provider === 'google' ? data.account.id.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3') : data.account.id} · {data.account.currency} · {from} – {to} · {data.account.timeZone}</p></div>
      <div className="flex items-center gap-2"><span className="text-xs text-secondary-text tabular-nums">Updated {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{refresh}</div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {([['Spend', money(data.totals.spend)], ['Impressions', number(data.totals.impressions)], ['Clicks', number(data.totals.clicks)], ['Click-through rate', percent(data.totals.ctr)], [resultLabel, number(data.totals.conversions)], [provider === 'google' ? 'Cost per conversion' : 'Cost per landing page view', data.totals.costPerConversion === null ? '—' : money(data.totals.costPerConversion)]] as const).map(([label, value]) => <Card key={label}><p className="text-xs text-secondary-text">{label}</p><p className="mt-2 break-words text-2xl font-semibold tabular-nums">{value}</p></Card>)}
    </div>
    <p className="text-xs text-secondary-text">{provider === 'google' ? 'Conversions are Google Ads’ attributed goal completions, not sales or unique visitors; Aimanté visits currently measures page views.' : 'Landing page views are ad clicks where the website finished loading, as reported by Meta; they are not sales or unique visitors.'} Recent results can arrive late.</p>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Daily performance</h3><div role="tablist" aria-label="Chart metric" className="flex rounded-lg bg-control-fill p-1">{(['clicks', 'spend', 'conversions'] as const).map(m => <Button key={m} size="sm" variant="ghost" role="tab" aria-selected={metric === m} className={metric === m ? 'bg-card shadow-card' : 'text-secondary-text'} onClick={() => setMetric(m)}>{m === 'spend' ? `Spend (${data.account.currency})` : m === 'clicks' ? 'Clicks' : resultLabel}</Button>)}</div></div>
      {data.days.length ? <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.days}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" tickFormatter={(day: string) => day.slice(5)} fontSize={12} stroke="var(--secondary-text)" /><YAxis fontSize={12} stroke="var(--secondary-text)" allowDecimals={metric !== 'clicks'} tickFormatter={(v: number) => metric === 'spend' ? money(v) : number(v)} width={72} /><Tooltip formatter={(v) => metric === 'spend' ? money(Number(v)) : number(Number(v))} /><Line type="monotone" dataKey={metric} name={metric === 'spend' ? 'Spend' : metric === 'clicks' ? 'Clicks' : resultLabel} stroke="var(--accent-blue)" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-secondary-text">No advertising activity in this period.</p>}
    </div>
    <div><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Campaigns</h3><Button variant="ghost" size="sm" disabled={!data.campaigns.length} onClick={exportCsv}><Download className="size-4" strokeWidth={1.7} />CSV</Button></div>
      <div className="overflow-x-auto"><table className="mt-2 w-full text-left text-sm"><thead className="text-xs text-secondary-text"><tr>{['Campaign', 'Status', 'Spend', 'Impressions', 'Clicks', 'CTR', resultLabel, 'Cost / result'].map(label => <th key={label} className="whitespace-nowrap border-b border-border px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{data.campaigns.map(c => <tr key={c.id} className="border-b border-border"><td className="min-w-40 px-3 py-3 font-medium">{c.name}</td><td className="px-3 py-3 text-xs text-secondary-text">{c.status === 'ENABLED' ? 'Enabled' : c.status === 'PAUSED' ? 'Paused' : c.status === 'REMOVED' ? 'Removed' : 'Unknown'}</td>{[money(c.spend), number(c.impressions), number(c.clicks), percent(c.ctr), number(c.conversions), c.costPerConversion === null ? '—' : money(c.costPerConversion)].map((v, i) => <td key={i} className="whitespace-nowrap px-3 py-3 tabular-nums">{v}</td>)}</tr>)}{!data.campaigns.length && <tr><td colSpan={8} className="py-6 text-center text-secondary-text">No campaigns reported in this period.</td></tr>}</tbody></table></div>
    </div>
  </section>;
}