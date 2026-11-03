import { PLANS, type PlanConfig } from "@/lib/stillframe/plans-config";
import { SITE_ORIGIN } from "./seo";

// Google Merchant Center feed for the plans on sale (retired plans are left out).
// Prices come from plans-config so the feed never drifts from /pricing.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Item = { id: string; title: string; description: string; price: number; period: "month" | "year" };

export function feedItems(plans: PlanConfig[] = PLANS): Item[] {
  return plans.filter((p) => !p.retired).flatMap((p) => {
    const base = `Gravity Pants ${p.name} plan. ${p.tagline} ${p.features.join(", ")}.`;
    const items: Item[] = [{ id: `gp-${p.id}-monthly`, title: `Gravity Pants ${p.name} — photo to video ad maker, monthly`, description: base, price: p.monthly, period: "month" }];
    if (p.yearly) items.push({ id: `gp-${p.id}-yearly`, title: `Gravity Pants ${p.name} — photo to video ad maker, yearly`, description: `${base} Billed yearly, 2 months free.`, price: p.yearly, period: "year" });
    return items;
  });
}

export function merchantFeedXml(): string {
  const link = `${SITE_ORIGIN}/pricing`;
  const image = `${SITE_ORIGIN}/merchant/gravity-pants-plan.jpg`;
  const items = feedItems().map((i) => `  <item>
    <g:id>${i.id}</g:id>
    <title>${esc(i.title)}</title>
    <description>${esc(i.description)}</description>
    <link>${link}</link>
    <g:image_link>${image}</g:image_link>
    <g:availability>in_stock</g:availability>
    <g:price>${i.price.toFixed(2)} USD</g:price>
    <g:condition>new</g:condition>
    <g:brand>Gravity Pants</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:google_product_category>313</g:google_product_category>
    <g:product_type>Software &gt; Video editing &gt; Subscription</g:product_type>
    <g:is_bundle>no</g:is_bundle>
    <g:shipping><g:country>US</g:country><g:price>0.00 USD</g:price></g:shipping>
    <g:custom_label_0>${i.period === "month" ? "monthly" : "yearly"}</g:custom_label_0>
  </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Gravity Pants plans</title>
  <link>${SITE_ORIGIN}</link>
  <description>Gravity Pants subscription plans</description>
${items}
</channel>
</rss>
`;
}
