/** Google Ads HTML5 upload rules (support.google.com/google-ads/answer/1722096). */
export const GOOGLE_ADS_MAX_ZIP_BYTES = 600 * 1024;
export const GOOGLE_ADS_MAX_SECONDS = 30;
export const GOOGLE_ADS_MAX_FILES = 40;

/** Display sizes Google Ads accepts for uploaded HTML5 ads. */
export const GOOGLE_ADS_SIZES: [number, number][] = [
  [300, 250], [336, 280], [728, 90], [300, 600], [320, 50], [160, 600], [468, 60], [970, 90],
  [970, 250], [250, 250], [200, 200], [120, 600], [300, 50], [320, 100], [480, 320], [320, 480],
  [300, 1050], [768, 1024], [1024, 768],
];
/** The common sizes offered as a one-tap add on the Export screen. */
export const GOOGLE_ADS_STARTER: [number, number][] = [[300, 250], [728, 90], [300, 600], [320, 50], [336, 280], [160, 600]];

export const isGoogleAdsSize = (w: number, h: number) => GOOGLE_ADS_SIZES.some(([a, b]) => a === w && b === h);

/** Plays allowed so total animation stays within 30 seconds; "forever" (0) becomes the max. */
export function adLoops(requested: number, seconds: number) {
  const fit = Math.floor(GOOGLE_ADS_MAX_SECONDS / Math.max(0.1, seconds));
  const want = requested > 0 ? requested : 3;
  return Math.max(1, Math.min(want, fit));
}
