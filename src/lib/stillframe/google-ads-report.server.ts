import { adsMetrics, type AdsMetrics } from './google-ads-report';

interface Row {
  customer?: { descriptiveName?: string; currencyCode?: string; timeZone?: string };
  campaign?: { id?: string; name?: string; status?: string };
  segments?: { date?: string };
  metrics?: { impressions?: string; clicks?: string; costMicros?: string; conversions?: number };
}

export async function googleAdsReport(from: string, to: string) {
  const bearer = process.env['LOVABLE_API_KEY'];
  const key = process.env['GOOGLE_ADS_API_KEY'];
  const customerId = process.env['GOOGLE_ADS_CUSTOMER_ID']?.replace(/-/g, '');
  if (!bearer || !key || !customerId || !/^\d+$/.test(customerId)) {
    return { status: 'unavailable' as const, message: 'Google Ads reporting is not connected.' };
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${bearer}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' };
  const manager = process.env['GOOGLE_ADS_LOGIN_CUSTOMER_ID'];
  if (manager) headers['login-customer-id'] = manager.replace(/-/g, '');
  const read = async (query: string): Promise<Row[]> => {
    const rows: Row[] = [];
    let pageToken: string | undefined;
    do {
      const response = await fetch(`https://connector-gateway.lovable.dev/google_ads/v25/customers/${customerId}/googleAds:search`, {
        method: 'POST', headers, signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
      });
      if (!response.ok) {
        console.error('Google Ads report', response.status, await response.text());
        throw new Error(`Google Ads could not return this report (${response.status}).`);
      }
      const page = await response.json() as { results?: Row[]; nextPageToken?: string };
      rows.push(...(page.results ?? []));
      pageToken = page.nextPageToken;
      if (rows.length > 50_000) throw new Error('This report is too large. Choose a shorter date range.');
    } while (pageToken);
    return rows;
  };
  try {
    const fields = 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions';
    const window = `segments.date BETWEEN '${from}' AND '${to}'`;
    const [accountRows, campaigns, daily] = await Promise.all([
      read('SELECT customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer'),
      read(`SELECT campaign.id, campaign.name, campaign.status, ${fields} FROM campaign WHERE ${window} ORDER BY metrics.cost_micros DESC`),
      read(`SELECT segments.date, ${fields} FROM customer WHERE ${window} ORDER BY segments.date`),
    ]);
    const account = accountRows[0]?.customer;
    if (!account?.currencyCode || !account.timeZone) throw new Error('Google Ads did not return the account currency and time zone.');
    const days = daily.map(row => ({ day: row.segments?.date ?? '', ...adsMetrics(row.metrics ?? {}) }));
    const sum = days.reduce((total, day) => ({ impressions: total.impressions + day.impressions, clicks: total.clicks + day.clicks, costMicros: total.costMicros + day.spend * 1_000_000, conversions: total.conversions + day.conversions }), { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 });
    const totals: AdsMetrics = adsMetrics(sum);
    return { status: 'ok' as const, account: { name: account.descriptiveName || 'Google Ads', id: customerId, currency: account.currencyCode, timeZone: account.timeZone }, from, to, updatedAt: new Date().toISOString(), totals, days,
      campaigns: campaigns.map(row => ({ id: row.campaign?.id ?? '', name: row.campaign?.name ?? 'Campaign', status: row.campaign?.status ?? 'UNKNOWN', ...adsMetrics(row.metrics ?? {}) })),
    };
  } catch (error) {
    return { status: 'unavailable' as const, message: error instanceof Error ? error.message : 'Google Ads is temporarily unavailable.' };
  }
}