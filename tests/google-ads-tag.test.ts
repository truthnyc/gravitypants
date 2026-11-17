import { describe, expect, it } from 'vitest';
import { AIMANTE_PAGE_VIEW, GOOGLE_ADS_ID, googleAdsPageAllowed } from '../src/lib/site/google-ads';
describe('Aimanté Google Ads visit tag', () => {
  it('runs only on aimante.co hosts', () => {
    expect(googleAdsPageAllowed('aimante.co')).toBe(true);
    expect(googleAdsPageAllowed('www.aimante.co')).toBe(true);
    for (const host of ['gravitypants.com', 'www.gravitypants.com', 'gravitypants.lovable.app', 'localhost']) expect(googleAdsPageAllowed(host)).toBe(false);
  });
  it('reports to the Gravity Pants account conversion', () => {
    expect(GOOGLE_ADS_ID).toBe('AW-18550494834');
    expect(AIMANTE_PAGE_VIEW.startsWith(`${GOOGLE_ADS_ID}/`)).toBe(true);
  });
});
