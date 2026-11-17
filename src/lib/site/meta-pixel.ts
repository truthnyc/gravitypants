export const PIXEL_ID = '1824507732209317';
type Pixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; push?: Pixel; loaded: boolean; version: string };
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel } }
let initialized = false;
let lastPage: string | null = null;
export function revokePixel() {
  window.fbq?.('consent', 'revoke');
}
export function trackPixelPage(path: string) {
  // Visit-only: never expose query-string or fragment identifiers. Ad/campaign tags are removed from the
  // address; when the address still carries page state (e.g. which Stage reel is open) we skip the visit
  // instead of erasing it, so the page keeps working.
  const url = new URL(window.location.href);
  const kept = [...url.searchParams.keys()].filter((k) => !isAdParam(k));
  if (kept.length || url.hash) return;
  if (url.search) window.history.replaceState(window.history.state, '', url.pathname);
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.search || ref.hash || /^\/(app|admin|shopify|auth)(\/|$)/.test(ref.pathname)) return;
    } catch { return; }
  }
  if (!window.fbq) {
    const pixel = ((...args: unknown[]) => { if (pixel.callMethod) pixel.callMethod.apply(pixel, args); else pixel.queue.push(args); }) as Pixel;
    pixel.queue = []; pixel.push = pixel; pixel.loaded = true; pixel.version = '2.0';
    window.fbq = pixel; window._fbq = pixel;
  }
  const fbq = window.fbq;
  fbq('consent', 'grant');
  if (!initialized) {
    fbq('set', 'autoConfig', false, PIXEL_ID);
    fbq('init', PIXEL_ID, {}, { agent: 'lovable' });
    initialized = true;
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'; script.id = 'gp-meta-pixel';
    document.head.appendChild(script);
  }
  if (lastPage === path) return;
  lastPage = path;
  fbq('track', 'PageView', {}, { eventID: crypto.randomUUID() });
}
/** Campaign and click identifiers that are safe to drop from the address bar. */
export function isAdParam(key: string) {
  return /^(utm_|gclid$|gbraid$|wbraid$|fbclid$|msclkid$|ttclid$|dclid$|gad_|_gl$|igshid$|mc_)/i.test(key);
}
