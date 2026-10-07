import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequestHost, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import type { LocationRewrite } from "@tanstack/react-router";

/** Which brand a visit is on. aimante.co shows the Aimanté directory; everything else is Gravity Pants. */
export type BrandSite = "gravitypants" | "aimante";

export const AIMANTE_ORIGIN = "https://aimante.co";
export const GP_ORIGIN = "https://gravitypants.com";
const AIMANTE_HOSTS = new Set(["aimante.co", "www.aimante.co"]);
const GP_HOSTS = new Set(["gravitypants.com", "www.gravitypants.com"]);
/** Preview override: ?brand=aimante (remembered in this cookie), ?brand=gravitypants turns it off. */
export const BRAND_COOKIE = "gp_brand_preview";

const hostOf = (host: string | null | undefined) => (host ?? "").toLowerCase().split(":")[0] ?? "";
export const isAimanteHost = (host: string | null | undefined) => AIMANTE_HOSTS.has(hostOf(host));
export const isGravityPantsHost = (host: string | null | undefined) => GP_HOSTS.has(hostOf(host));

export function siteForHost(host: string | null | undefined): BrandSite {
  return isAimanteHost(host) ? "aimante" : "gravitypants";
}

/** Real domains always win; any other host (Lovable preview, localhost) may use the override. */
export function resolveSite(host: string, brandParam: string | null, cookie: string | null | undefined): BrandSite {
  if (isAimanteHost(host)) return "aimante";
  if (isGravityPantsHost(host)) return "gravitypants";
  if (brandParam === "aimante") return "aimante";
  if (brandParam === "gravitypants") return "gravitypants";
  return cookie === "aimante" ? "aimante" : "gravitypants";
}

const COOKIE_AGE = 60 * 60 * 24 * 30;

const readCookie = createIsomorphicFn()
  .server(() => {
    // On the first preview visit the cookie isn't sent yet, so the request's own ?brand= counts too.
    try { return getRequestUrl().searchParams.get("brand") ?? getCookie(BRAND_COOKIE); } catch { return undefined; }
  })
  .client(() => document.cookie.split("; ").find((c) => c.startsWith(`${BRAND_COOKIE}=`))?.split("=")[1]);

/** Remembers ?brand=… so later pages in the preview keep the same brand. */
const writeCookie = createIsomorphicFn()
  .server((v: string) => { try { setCookie(BRAND_COOKIE, v, { path: "/", maxAge: COOKIE_AGE, sameSite: "lax" }); } catch { /* outside a request */ } })
  .client((v: string) => { document.cookie = `${BRAND_COOKIE}=${v}; path=/; max-age=${COOKIE_AGE}; samesite=lax`; });

export function siteForUrl(url: URL): BrandSite {
  const param = url.searchParams.get("brand");
  if ((param === "aimante" || param === "gravitypants") && !isAimanteHost(url.host) && !isGravityPantsHost(url.host)) writeCookie(param);
  return resolveSite(url.host, param, readCookie());
}

export const currentSite = createIsomorphicFn()
  .server(() => {
    try { return siteForUrl(getRequestUrl({ xForwardedHost: true })); } catch { /* outside a request */ }
    try { return siteForHost(getRequestHost({ xForwardedHost: true })); } catch { return "gravitypants" as BrandSite; }
  })
  .client(() => siteForUrl(new URL(window.location.href)));

/** True for the public paths that belong to Aimanté. */
export function isAimantePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/" || p === "/join" || p === "/about" || p === "/sign-in" || /^\/(c|mood|b)\/[^/]+$/.test(p);
}

/** Public Aimanté URL → the app's internal page. Pure apart from the site check. */
export function aimanteIn(url: URL, site: BrandSite = siteForUrl(url)): URL | undefined {
  if (site !== "aimante") return undefined;
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const out = new URL(url.href);
  out.searchParams.delete("brand");
  let m: RegExpMatchArray | null;
  if (p === "/") out.pathname = "/directory";
  else if ((m = p.match(/^\/c\/([^/]+)$/))) { out.pathname = "/directory"; out.searchParams.set("category", decodeURIComponent(m[1] ?? "")); }
  else if ((m = p.match(/^\/mood\/([^/]+)$/))) { out.pathname = "/directory"; out.searchParams.set("mood", decodeURIComponent(m[1] ?? "")); }
  else if ((m = p.match(/^\/b\/([^/]+)$/))) out.pathname = `/directory/${m[1]}`;
  else if (p === "/join" || p === "/about") out.pathname = `/aimante${p}`;
  else if (p === "/sign-in") out.pathname = "/signin";
  else return undefined;
  return out;
}

/** Internal page → the public Aimanté URL. */
export function aimanteOut(url: URL, site: BrandSite = siteForUrl(url)): URL | undefined {
  if (site !== "aimante") return undefined;
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
  else if (p === "/signin") out.pathname = "/sign-in";
  else return undefined;
  return out;
}

export const aimanteRewrite: LocationRewrite = {
  input: ({ url }) => aimanteIn(url),
  output: ({ url }) => aimanteOut(url),
};

/**
 * Cross-domain redirects for the real domains only (previews never redirect):
 * aimante.co → gravitypants.com for anything that isn't an Aimanté page;
 * gravitypants.com/directory… → the matching aimante.co page.
 */
export function domainRedirect(href: string, forwardedHost?: string | null): string | null {
  const url = new URL(href);
  if (forwardedHost) url.host = hostOf(forwardedHost);
  if (isAimanteHost(url.host)) {
    if (url.pathname.startsWith("/directory")) {
      const out = aimanteOut(url, "aimante");
      return out ? `${AIMANTE_ORIGIN}${out.pathname}${out.search}` : null;
    }
    if (isAimantePath(url.pathname)) return null;
    return `${GP_ORIGIN}${url.pathname}${url.search}`;
  }
  if (isGravityPantsHost(url.host) && (/^\/directory\/?$/.test(url.pathname) || /^\/directory\/[^/]+\/?$/.test(url.pathname))) {
    const out = aimanteOut(url, "aimante");
    return out ? `${AIMANTE_ORIGIN}${out.pathname}${out.search}` : AIMANTE_ORIGIN;
  }
  return null;
}

/** Head tags for an Aimanté page: its own origin, canonical and share image. */
export function aimanteHead({ path, title, description, image = `${AIMANTE_ORIGIN}/og-aimante.jpg` }: { path: string; title: string; description: string; image?: string }) {
  const url = `${AIMANTE_ORIGIN}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:site_name", content: "Aimanté" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
