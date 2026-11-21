import { describe, expect, it } from 'vitest';
import { adsMetrics } from '../src/lib/stillframe/google-ads-report';

describe('Google Ads reporting units', () => {
  it('converts micros to account currency and calculates weighted rates', () => {
    expect(adsMetrics({ costMicros: '20000000', impressions: '4460', clicks: '98', conversions: 14 })).toEqual({ spend: 20, impressions: 4460, clicks: 98, conversions: 14, ctr: 98 / 4460, costPerConversion: 20 / 14 });
  });
  it('leaves cost per conversion unavailable when there are no conversions', () => {
    expect(adsMetrics({ costMicros: '10000000', conversions: 0 }).costPerConversion).toBeNull();
    expect(adsMetrics({}).ctr).toBe(0);
  });
});