/**
 * Google Ads tag for the Aimanté visits campaign. IDs are public (they ship in the page).
 * Loaded only after the shared advertising consent allows it; ad personalization stays off
 * because the notice covers visit measurement only.
 */
export const GOOGLE_ADS_ID = 'AW-18550494834';
/** "Aimanté page view" conversion action, copied from Google's tag snippet. */
export const AIMANTE_PAGE_VIEW = 'AW-18550494834/KcfTCKnFtLodEPKsyI1F';

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }

export function googleAdsPageAllowed(host: string) {
  return host === 'aimante.co' || host === 'www.aimante.co';
}

let loading: Promise<void> | null = null;
let reported = false;

function gtag(...args: unknown[]) {
  window.dataLayer ??= [];
  window.gtag ??= function () {
    // eslint-disable-next-line prefer-rest-params -- gtag.js needs the Arguments object
    window.dataLayer!.push(arguments);
  };
  window.gtag(...args);
}

const GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' };
const DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };

/** Loads the tag once; resolves when it has read the landing address (or after 3s). */
function loadGoogleAds(): Promise<void> {
  if (loading) return loading;
  gtag('consent', 'update', GRANTED);
  gtag('set', 'developer_id.dZjgwMW', true);
  gtag('js', new Date());
  gtag('config', GOOGLE_ADS_ID, { send_page_view: false, allow_ad_personalization_signals: false });
  loading = new Promise<void>(resolve => {
    const script = document.createElement('script');
    script.async = true; script.id = 'gp-google-ads';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ADS_ID)}`;
    script.onload = () => resolve(); script.onerror = () => resolve();
    setTimeout(resolve, 3000);
    document.head.appendChild(script);
  });
  return loading;
}

/** Reports one Aimanté visit per page load. Call only when advertising consent allows it. */
export async function reportAimanteVisit(host: string): Promise<void> {
  if (!googleAdsPageAllowed(host)) return;
  try {
    const ready = loadGoogleAds();
    gtag('consent', 'update', GRANTED);
    if (!reported) { reported = true; gtag('event', 'conversion', { send_to: AIMANTE_PAGE_VIEW }); }
    await ready;
  } catch { /* measurement must never break the page */ }
}

/** Refusal or withdrawal: stop advertising storage and new events immediately. */
export function revokeGoogleAds() {
  if (window.gtag) window.gtag('consent', 'update', DENIED);
}
