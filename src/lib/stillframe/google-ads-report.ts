export interface AdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  costPerConversion: number | null;
}

export function adsMetrics(raw: { impressions?: string | number; clicks?: string | number; costMicros?: string | number; conversions?: string | number }): AdsMetrics {
  const impressions = Number(raw.impressions ?? 0);
  const clicks = Number(raw.clicks ?? 0);
  const spend = Number(raw.costMicros ?? 0) / 1_000_000;
  const conversions = Number(raw.conversions ?? 0);
  return { impressions, clicks, spend, conversions, ctr: impressions ? clicks / impressions : 0, costPerConversion: conversions ? spend / conversions : null };
}