import { describe, expect, it } from 'vitest';
import { AD_NOTICE, NOTICE_VERSION, advertisingAllowed, appendChoice, parseConsent, pixelPageAllowed, requiresConsent } from '../src/lib/site/ad-consent';
describe('Gravity Pants website visit permission', () => {
  it('requires consent in regulated and unresolved regions', () => {
    for (const region of ['GB', 'FR', 'DE', 'CH', 'XX', 'T1', null]) expect(requiresConsent(region)).toBe(true);
    expect(requiresConsent('US')).toBe(false);
  });
  it('allows only consented visits in regulated regions', () => {
    expect(advertisingAllowed('GB', undefined, false)).toBe(false);
    const yes = appendChoice(null, true, 'GB').choices[0];
    expect(advertisingAllowed('GB', yes, false)).toBe(true);
  });
  it('honours rejection and opt-outs even outside consent regions', () => {
    const no = appendChoice(null, false, 'US').choices[0];
    expect(advertisingAllowed('US', no, false)).toBe(false);
    expect(advertisingAllowed('US', undefined, true)).toBe(false);
  });
  it('retains acceptance evidence after withdrawal', () => {
    const accepted = appendChoice(null, true, 'GB');
    const withdrawn = appendChoice(accepted, false, 'GB');
    expect(withdrawn.visitor).toBe(accepted.visitor);
    expect(withdrawn.choices.map(c => c.advertising)).toEqual([true, false]);
    expect(withdrawn.choices[0]?.notice).toBe(AD_NOTICE);
    expect(withdrawn.choices[0]?.noticeVersion).toBe(NOTICE_VERSION);
    expect(parseConsent(JSON.stringify(withdrawn))).toEqual(withdrawn);
    expect(parseConsent('{"advertising":true}')).toBeNull();
  });
  it('limits tracking to public gravitypants.com pages', () => {
    expect(pixelPageAllowed('gravitypants.com', '/')).toBe(true);
    expect(pixelPageAllowed('www.gravitypants.com', '/pricing')).toBe(true);
    for (const host of ['aimante.co', 'www.aimante.co', 'localhost', 'gravitypants.lovable.app']) expect(pixelPageAllowed(host, '/')).toBe(false);
    for (const path of ['/app/ads', '/admin', '/shopify', '/embed/reel/id', '/signup', '/auth/callback']) expect(pixelPageAllowed('gravitypants.com', path)).toBe(false);
  });
});