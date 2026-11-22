import { adsMetrics } from './google-ads-report';

const GATEWAY = 'https://connector-gateway.lovable.dev/meta_ads/v26.0';
const RESULT_ACTION = 'landing_page_view';

interface Insight { campaign_id?: string; date_start?: string; impressions?: string; clicks?: string; spend?: string; actions?: { action_type: string; value: string }[] }

const toMetrics = (row: Insight) => adsMetrics({ impressions: row.impressions ?? 0, clicks: row.clicks ?? 0, costMicros: Number(row.spend ?? 0) * 1_000_000, conversions: row.actions?.find(a => a.action_type === RESULT_ACTION)?.value ?? 0 });

export async function metaAdsReport(from: string, to: string) {
  const bearer = process.env['LOVABLE_API_KEY'];
  const key = process.env['META_ADS_API_KEY'];
  const account = (process.env['META_ADS_ACCOUNT_ID'] ?? 'act_1101769655829089').replace(/^(?!act_)/, 'act_');
  if (!bearer || !key || !/^act_\d+$/.test(account)) return { status: 'unavailable' as const, message: 'Facebook Ads reporting is not connected.' };
  const headers = { Authorization: `Bearer ${bearer}`, 'X-Connection-Api-Key': key };
  const read = async <T,>(path: string, params: Record<string, string>): Promise<T[]> => {
    const rows: T[] = [];
    let url: string | undefined = `${GATEWAY}/${path}?${new URLSearchParams({ limit: '500', ...params })}`;
    while (url) {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) { console.error('Meta Ads report', response.status, await response.text()); throw new Error(`Facebook Ads could not return this report (${response.status}).`); }
      const page = await response.json() as { data?: T[]; paging?: { next?: string; cursors?: { after?: string } } };
      rows.push(...(page.data ?? []));
      const after = page.paging?.next ? page.paging.cursors?.after : undefined;
      url = after ? `${GATEWAY}/${path}?${new URLSearchParams({ limit: '500', ...params, after })}` : undefined;
      if (rows.length > 20_000) throw new Error('This report is too large. Choose a shorter date range.');
    }
    return rows;
  };
  try {
    const time_range = JSON.stringify({ since: from, until: to });
    const fields = 'impressions,clicks,spend,actions';
    const [infoRes, campaigns, byCampaign, daily] = await Promise.all([
      fetch(`${GATEWAY}/${account}?fields=name,currency,timezone_name`, { headers, signal: AbortSignal.timeout(20_000) }),
      read<{ id: string; name: string; effective_status: string }>(`${account}/campaigns`, { fields: 'id,name,effective_status' }),
      read<Insight>(`${account}/insights`, { level: 'campaign', fields: `campaign_id,${fields}`, time_range }),
      read<Insight>(`${account}/insights`, { level: 'account', fields, time_range, time_increment: '1' }),
    ]);
    if (!infoRes.ok) { console.error('Meta Ads account', infoRes.status, await infoRes.text()); throw new Error(`Facebook Ads could not return the account (${infoRes.status}).`); }
    const info = await infoRes.json() as { name?: string; currency?: string; timezone_name?: string };
    if (!info.currency || !info.timezone_name) throw new Error('Facebook Ads did not return the account currency and time zone.');
    const days = daily.map(row => ({ day: row.date_start ?? '', ...toMetrics(row) }));
    const sum = days.reduce((t, d) => ({ impressions: t.impressions + d.impressions, clicks: t.clicks + d.clicks, costMicros: t.costMicros + d.spend * 1_000_000, conversions: t.conversions + d.conversions }), { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 });
    const stats = new Map(byCampaign.map(row => [row.campaign_id, toMetrics(row)]));
    const status = (s: string) => s === 'ACTIVE' ? 'ENABLED' : s === 'PAUSED' || s === 'CAMPAIGN_PAUSED' ? 'PAUSED' : s === 'DELETED' || s === 'ARCHIVED' ? 'REMOVED' : 'UNKNOWN';
    return { status: 'ok' as const, account: { name: info.name || 'Facebook Ads', id: account.replace('act_', ''), currency: info.currency, timeZone: info.timezone_name }, from, to, updatedAt: new Date().toISOString(), totals: adsMetrics(sum), days,
      campaigns: campaigns.map(c => ({ id: c.id, name: c.name, status: status(c.effective_status), ...(stats.get(c.id) ?? adsMetrics({})) })).sort((a, b) => b.spend - a.spend),
    };
  } catch (error) {
    return { status: 'unavailable' as const, message: error instanceof Error ? error.message : 'Facebook Ads is temporarily unavailable.' };
  }
}
