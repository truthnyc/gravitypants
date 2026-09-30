/** One place for the website's page titles, descriptions, social previews and canonical URLs. */
export const SITE_ORIGIN = "https://gravitypants.com";
export const SITE_NAME = "Gravity Pants";
/** Absolute URL: social networks never resolve bundled or relative image paths. */
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/og-cover.jpg`;

type HeadInput = {
  /** Route path starting with a slash, e.g. "/pricing". */
  path: string;
  title: string;
  description: string;
  /** Absolute https image URL. Defaults to the shared social cover. */
  image?: string;
  ogType?: "website" | "article";
  /** Keep this page out of search results. */
  noindex?: boolean;
};

export function siteHead({ path, title, description, image = SITE_OG_IMAGE, ogType = "website", noindex = false }: HeadInput) {
  const url = `${SITE_ORIGIN}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: ogType },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
