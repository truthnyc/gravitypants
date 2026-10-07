import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import type { LocationRewrite } from "@tanstack/react-router";

/** Which brand a hostname serves. aimante.co shows the Aimanté directory; everything else is Gravity Pants. */
export type BrandSite = "gravitypants" | "aimante";

const AIMANTE_HOSTS = new Set(["aimante.co", "www.aimante.co"]);

export function siteForHost(host: string | null | undefined): BrandSite {
  const h = (host ?? "").toLowerCase().split(":")[0];
  return AIMANTE_HOSTS.has(h) ? "aimante" : "gravitypants";
}

export const currentSite = createIsomorphicFn()
  .server(() => siteForHost(getRequestHost({ xForwardedHost: true })))
  .client(() => siteForHost(window.location.hostname));

/**
 * Public Aimanté URLs ↔ the app's internal Directory routes, so both brands share one set of pages.
 * Pure: only rewrites when the URL's host is an Aimanté host.
 */
export function aimanteIn(url: URL): URL | undefined {
  if (siteForHost(url.host) !== "aimante") return undefined;
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const out = new URL(url.href);
  let m: RegExpMatchArray | null;
  if (p === "/") out.pathname = "/directory";
  else if ((m = p.match(/^\/c\/([^/]+)$/))) { out.pathname = "/directory"; out.searchParams.set("category", decodeURIComponent(m[1])); }
  else if ((m = p.match(/^\/mood\/([^/]+)$/))) { out.pathname = "/directory"; out.searchParams.set("mood", decodeURIComponent(m[1])); }
  else if ((m = p.match(/^\/b\/([^/]+)$/))) out.pathname = `/directory/${m[1]}`;
  else if (p === "/join" || p === "/about") out.pathname = `/aimante${p}`;
  else return undefined;
  return out;
}

export function aimanteOut(url: URL): URL | undefined {
  if (siteForHost(url.host) !== "aimante") return undefined;
  const p = url.pathname;
  const out = new URL(url.href);
  let m: RegExpMatchArray | null;
  if (p === "/directory" || p === "/directory/") {
    const keys = [...url.searchParams.keys()];
    const cat = url.searchParams.get("category");
    const mood = url.searchParams.get("mood");
    if (keys.length === 1 && cat && !cat.includes(",")) { out.pathname = `/c/${encodeURIComponent(cat)}`; out.search = ""; }
    else if (keys.length === 1 && mood && !mood.includes(",")) { out.pathname = `/mood/${encodeURIComponent(mood)}`; out.search = ""; }
    else out.pathname = "/";
  } else if ((m = p.match(/^\/directory\/category\/([^/]+)$/))) out.pathname = `/c/${m[1]}`;
  else if ((m = p.match(/^\/directory\/([^/]+)$/))) out.pathname = `/b/${m[1]}`;
  else if ((m = p.match(/^\/aimante\/(join|about)$/))) out.pathname = `/${m[1]}`;
  else return undefined;
  return out;
}

export const aimanteRewrite: LocationRewrite = {
  input: ({ url }) => aimanteIn(url),
  output: ({ url }) => aimanteOut(url),
};
