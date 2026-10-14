import type { GuideSectionData } from "@/lib/stillframe/guide";
import start from "@/assets/guide/start.webp.asset.json";
import create from "@/assets/guide/create.webp.asset.json";
import edit from "@/assets/guide/edit.webp.asset.json";
import templates from "@/assets/guide/templates.webp.asset.json";
import brand from "@/assets/guide/brand.webp.asset.json";
import exportScreen from "@/assets/guide/export.webp.asset.json";
import share from "@/assets/guide/share.webp.asset.json";
import team from "@/assets/guide/team.webp.asset.json";
import stats from "@/assets/guide/stats.webp.asset.json";
import directory from "@/assets/guide/directory.webp.asset.json";
import billing from "@/assets/guide/billing.webp.asset.json";
import support from "@/assets/guide/support.webp.asset.json";

type Screenshot = { url: string; width: number; height: number; alt: string };
const screenshots: Partial<Record<GuideSectionData["illustration"], Screenshot>> = {
  start: { url: start.url, width: 1152, height: 205, alt: "Your Ads: New ad from photos, Choose Photos and Start from a template." },
  create: { url: create.url, width: 710, height: 530, alt: "Format step with Vertical, Portrait, Square, Landscape and Wide main size choices." },
  edit: { url: edit.url, width: 1132, height: 758, alt: "Edit screen with a real reel preview, frame rail and Text Inspector controls." },
  templates: { url: templates.url, width: 1152, height: 820, alt: "Templates page with template tabs and real reel previews." },
  brand: { url: brand.url, width: 896, height: 420, alt: "Brand Kit page showing saved kits, logos and headline and subline fonts." },
  export: { url: exportScreen.url, width: 1132, height: 820, alt: "Export screen with a reel preview, main and additional sizes, MP4 and GIF choices." },
  share: { url: share.url, width: 1132, height: 680, alt: "Share screen with Download files and the optional Directory sharing switch turned off." },
  team: { url: team.url, width: 732, height: 170, alt: "Team invitation form with an empty email field, role selector and Send invite button." },
  stats: { url: stats.url, width: 1060, height: 615, alt: "Brand stats page with date ranges, views, saves, clicks and a performance chart." },
  directory: { url: directory.url, width: 1184, height: 820, alt: "Aimanté directory with search, mood, category and brand filters and featured brand reels." },
  billing: { url: billing.url, width: 732, height: 223, alt: "Billing screen showing extra export packs of five, ten and twenty exports." },
  support: { url: support.url, width: 460, height: 474, alt: "Contact support dialog with topic choices, message field and screenshot attachment control." },
};

export function GuideScreenshot({ section }: { section: GuideSectionData }) {
  const screenshot = screenshots[section.illustration];
  if (!screenshot) return null;
  return <figure className="my-6 overflow-hidden rounded-sm border border-ap-hairline bg-ap-panel">
    <img src={screenshot.url} alt={screenshot.alt} width={screenshot.width} height={screenshot.height} loading="lazy" decoding="async" className="block h-auto w-full" />
  </figure>;
}