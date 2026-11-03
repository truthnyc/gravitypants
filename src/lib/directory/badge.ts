import { AIMANTE_ORIGIN } from "@/lib/site/brand-site";

/** "As seen on Aimanté" badge, served as /badge/{light|dark}.svg. Colors mirror the Aimanté ink/card tokens. */
export const BADGE_VARIANTS = ["light", "dark"] as const;
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];

export function badgeSvg(v: BadgeVariant): string {
  const dark = v === "dark";
  const bg = dark ? "#1D1D1F" : "#FFFFFF";
  const stroke = dark ? "#1D1D1F" : "#D2D2D7";
  const ink = dark ? "#FFFFFF" : "#1D1D1F";
  const muted = dark ? "#A1A1A6" : "#6E6E73";
  const font = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="As seen on Aimanté"><title>As seen on Aimanté</title>
<rect x="0.5" y="0.5" width="159" height="39" rx="8" fill="${bg}" stroke="${stroke}"/>
<text x="14" y="25.5" font-family="${font}" font-size="11" fill="${muted}">As seen on</text>
<text x="74" y="26.5" font-family="${font}" font-size="18" font-weight="600" letter-spacing="-0.72" fill="${ink}">Aimanté</text>
</svg>`;
}

export const badgeUrl = (v: BadgeVariant) => `${AIMANTE_ORIGIN}/badge/${v}.svg`;
export const brandPageUrl = (slug: string) => `${AIMANTE_ORIGIN}/b/${slug}`;
/** Plain link, no nofollow, no tracking parameters. */
export const badgeSnippet = (slug: string, v: BadgeVariant) =>
  `<a href="${brandPageUrl(slug)}"><img src="${badgeUrl(v)}" alt="As seen on Aimanté" width="160" height="40"></a>`;
export const bioLine = (slug: string) => `Featured on Aimanté, the directory for discovering brands by mood: ${brandPageUrl(slug)}`;
