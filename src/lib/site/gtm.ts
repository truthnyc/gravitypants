import { measurementPageAllowed } from './ad-consent';

/**
 * Google Tag Manager container. The ID is public — it ships inside the page — so it lives
 * here rather than in a secret. Empty means Tag Manager stays off everywhere.
 */
export const GTM_CONTAINER_ID = 'GTM-P66HK9ZR';

/** Where the container comes from, or null when it must stay off for this page. */
export function gtmScriptUrl(host: string, path: string, id = GTM_CONTAINER_ID) {
  if (!id || !measurementPageAllowed(host, path)) return null;
  return `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
}


declare global { interface Window { dataLayer?: unknown[] } }

let containerAdded = false;
let lastPath: string | null = null;

/** Loads the container once, then announces every new screen: a route change is not a page load. */
export function trackGtmPage(host: string, path: string) {
  if (typeof window === 'undefined') return;
  const url = gtmScriptUrl(host, path);
  if (!url) return;
  window.dataLayer ??= [];
  if (!containerAdded) {
    containerAdded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.id = 'gp-gtm';
    script.src = url;
    document.head.appendChild(script);
  }
  if (lastPath === path) return;
  lastPath = path;
  window.dataLayer.push({ event: 'gp_page_view', page_path: path, page_location: `${window.location.origin}${path}` });
}
