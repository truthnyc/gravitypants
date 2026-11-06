/**
 * The one place prices, limits and features for every plan are defined.
 * Read by the public /pricing page and by the app's plan checks (plan.ts, plan-map.ts).
 * The payment provider prices and the SQL export_status limits must match these numbers.
 */
export type PlanId = "starter" | "simple" | "business" | "team";
export type Billing = "monthly" | "yearly";

export const TRIAL = {
  name: "Free",
  exports: 6, // in total, no time limit
  cleanExports: 1, // the first export has no watermark
  watermark: true, // exports after the clean one
  blurb: "Your first reel free, no watermark. Then 5 more watermarked exports. No credit card.",
} as const;

/** Extra export packs: never expire, paid plans only (checked server-side in createTopUpSession).
 *  Ids are payment price ids; the webhook credits `exports` for the matching id. */
export const EXPORT_PACKS = [
  { id: "extra_exports_5", exports: 5, price: 25 },
  { id: "extra_exports_10", exports: 10, price: 45 },
  { id: "extra_exports_20", exports: 20, price: 80 },
] as const;
export type ExportPackId = (typeof EXPORT_PACKS)[number]["id"];
export const PACKS_LINE = "Extra exports: 5 for $25, 10 for $45, 20 for $80";

export const YEARLY_LABEL = "2 months free";

/** Plan families that may buy export packs. */
export const PACK_TIERS: readonly string[] = ["starter", "simple", "business", "team"];
/** Plan families with HTML5 export and Aimanté insights. */
export const HTML5_TIERS: readonly string[] = ["business", "team"];

export const REFERRAL_NOTE = "Give a reel, get a reel. Share your referral link: when a friend signs up and exports their first reel, you get 1 free export with no watermark.";

export type PlanConfig = {
  id: PlanId;
  name: string;
  tagline: string;
  seats: number;
  monthlyExports: number;
  sharedExports: boolean;
  monthly: number; // dollars
  yearly: number | null; // dollars, null = monthly billing only
  features: string[];
  /** Feature rows in the compare table this plan includes. */
  team: boolean;
  /** No longer sold to new customers; kept so existing subscribers keep their plan. */
  retired?: boolean;
};

export const PLANS: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For trying video ads on a few products.",
    seats: 1,
    monthlyExports: 5,
    sharedExports: false,
    monthly: 19,
    yearly: 190,
    team: false,
    features: ["1 seat", "5 exports a month", "No watermark", "MP4 and GIF", "Brand kit: logo, colors, fonts", "Every Google Font", "AI headline and subline suggestions"],
  },
  {
    id: "simple",
    name: "Simple",
    tagline: "For businesses making a few ads each month.",
    seats: 1,
    monthlyExports: 10,
    sharedExports: false,
    monthly: 35,
    yearly: 350,
    team: false,
    retired: true,
    features: ["1 seat", "10 exports a month", "Vertical 9:16, Portrait 4:5, Square 1:1, Wide 5:4, Landscape 16:9 and custom", "MP4 and GIF", "Every Google Font", "Brand kit: logo, colors, fonts", "AI headline and subline suggestions", "Duplicate with new photos", "Save as template", "No watermark", "Need more? Packs of 5, 10 or 20 extra exports"],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For businesses running ads every week.",
    seats: 1,
    monthlyExports: 30,
    sharedExports: false,
    monthly: 79,
    yearly: 790,
    team: false,
    features: ["Everything in Starter", "30 exports a month", "AI headline and subline suggestions", "HTML5 export", "Aimanté insights"],
  },
  {
    id: "team",
    name: "Team",
    tagline: "For teams working across shared ads and brands.",
    seats: 5,
    monthlyExports: 150,
    sharedExports: true,
    monthly: 175,
    yearly: 1750,
    team: true,
    features: ["Everything in Business", "AI headline and subline suggestions", "HTML5 export", "You + 4 teammates", "150 exports a month, shared", "Shared brand kits", "Shared templates", "Priority support"],
  },
];

/** The plan marked "Most popular" on /pricing. */
export const POPULAR_PLAN: PlanId = "business";

/** Customer-visible Stripe catalogue copy, derived from the same plan rows shown on /pricing. */
export function checkoutProductCopy(p: PlanConfig) {
  return {
    name: `Gravity Pants ${p.name}`,
    description: p.features.join(", "),
  };
}

/** Plans offered to new customers (Simple is retired; existing Simple subscribers are grandfathered). */
export const SALE_PLANS: PlanConfig[] = PLANS.filter((p) => !p.retired);

export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Cost of one reel at the plan's monthly price, e.g. "$3.50". */
export const perReel = (p: PlanConfig) => `$${(p.monthly / p.monthlyExports).toFixed(2)}`;

/** Price text for a plan card in the chosen billing mode. Yearly shows the per-month equivalent. */
export function priceFor(p: PlanConfig, billing: Billing) {
  if (billing === "yearly" && p.yearly != null) {
    const perMonth = Math.round(p.yearly / 12);
    return { price: usd(perMonth), per: "/mo", note: `billed ${usd(p.yearly)} yearly` };
  }
  const note = billing === "yearly" ? "Monthly billing only" : p.seats > 1 ? `Billed monthly · ${p.seats} seats` : "Billed monthly";
  return { price: usd(p.monthly), per: "/mo", note };
}

export function signupHref(p: PlanConfig, billing: Billing) {
  const b = p.yearly == null ? "monthly" : billing;
  return `/signup?plan=${p.id}&billing=${b}`;
}

type Cell = string | boolean;
export type CompareRow = { label: string; href?: string; cells: Cell[] }; // free, then each plan in SALE_PLANS order
export type CompareGroup = { group: string; rows: CompareRow[] };

const priceCell = (p: PlanConfig) => (p.yearly ? `${usd(p.monthly)} / month|or ${usd(p.yearly)} / year` : `${usd(p.monthly)} / month`);
const all = (v: Cell) => [v, ...SALE_PLANS.map(() => v)];
const byPlan = (free: Cell, f: (p: PlanConfig) => Cell) => [free, ...SALE_PLANS.map(f)];

export const COMPARE: CompareGroup[] = [
  {
    group: "Plan",
    rows: [
      { label: "Price", cells: byPlan("Free, no card", priceCell) },
      { label: "Cost per reel", cells: byPlan("—", perReel) },
      { label: "Seats", cells: byPlan("1", (p) => String(p.seats)) },
      { label: "Exports a month", cells: byPlan(`${TRIAL.exports} in total`, (p) => (p.sharedExports ? `${p.monthlyExports}, shared` : String(p.monthlyExports))) },
      { label: "Watermark", cells: byPlan("After first export", () => "No") },
      { label: "Export packs", cells: byPlan(false, () => true) },
      { label: "Aimanté brand page", href: "https://aimante.co/join", cells: byPlan("Your page, reels without a watermark", (p) => (HTML5_TIERS.includes(p.id) ? "Full page + insights" : "Full page, unlimited reels")) },
    ],
  },
  {
    group: "Create & export",
    rows: [
      ...["9:16, 4:5, 1:1, 5:4, 16:9 and custom", "MP4", "GIF", "Every Google Font"].map((label) => ({ label, cells: all(true) })),
      { label: "AI headline and subline suggestions", cells: byPlan(false, () => true) },
      { label: "HTML5", cells: byPlan(false, (p) => HTML5_TIERS.includes(p.id)) },
    ],
  },
  {
    group: "Brand & reuse",
    rows: [
      { label: "Brand kit", cells: all(true) },
      ...["Duplicate with new photos", "Save as template"].map((label) => ({ label, cells: all(true) })),
    ],
  },
  {
    group: "Team",
    rows: ["Shared brand kits", "Shared templates", "Priority support"].map((label) => ({ label, cells: byPlan(false, (p) => p.team) })),
  },
];

export const FAQ: { q: string; a: string; href?: "/referrals" }[] = [
  { q: "Can I try it before paying?", a: "Yes. Every account starts on the Free plan, with no time limit and no card. Your first export has no watermark, and you get 5 more exports with a small Gravity Pants mark. Your reels and brand kit stay saved, and a reel on Aimanté stays live." },
  { q: "What if I need more than 5 exports on Starter?", a: "For a busy month, buy a pack from Account → Billing: 5 exports for $25, 10 for $45 or 20 for $80. Packs never expire and are available on every paid plan. If you regularly need 20 or more, Business is the better deal: 30 exports a month for $79, about $2.63 a reel." },
  { q: "How does the referral program work?", a: `${REFERRAL_NOTE} Your link, your credits and the friends who joined are all in Account → Billing. The reward lands when your friend's first export finishes — signing up alone doesn't trigger it.`, href: "/referrals" },
  { q: "What kind of photos work best?", a: "Clear product photos with some space around the product work best. Phone photos are fine: three to five of them make a good reel." },
  { q: "Which formats can I export?", a: "Choose Vertical 9:16 for Reels, Stories and TikTok; Portrait 4:5, recommended for Instagram, Facebook and LinkedIn feeds; Square 1:1 for square posts; Wide 5:4 for websites, Facebook and LinkedIn feeds; or Landscape 16:9 for banners and YouTube. Custom sizes are available too. Each selected shape exports as MP4, GIF or both. HTML5 is on Business and Team." },
  { q: "Can the AI write my headlines?", a: "Yes, on every paid plan. In the editor, click Suggest headline or Suggest subline under the text box and pick one of three short options written from your photo and brand. Add a direction like holiday or playful, or ask for more options. Nothing changes until you click one, and it never makes up prices or discounts. AI suggestions are not part of the Free plan." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from Account → Billing in the app whenever you like. You keep full access until the end of the period you've already paid for, and we don't charge you again." },
  { q: "Do I own the reels I make?", a: "Yes. Every reel you export is yours to use wherever you like, forever — including reels made on the Free plan. We never claim any rights over your photos or your finished videos." },
  { q: "Do you offer discounts?", a: "Yes. Registered nonprofits get 10% off any plan: write to help@gravitypants.com with proof of status. Yearly billing also gives you 2 months free on every plan." },
];
