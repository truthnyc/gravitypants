/**
 * The one place prices, limits and features for every plan are defined.
 * Read by the public /pricing page and by the app's plan checks (plan.ts, plan-map.ts).
 * The payment provider prices and the SQL export_status limits must match these numbers.
 */
export type PlanId = "simple" | "business" | "team";
export type Billing = "monthly" | "yearly";

export const TRIAL = {
  name: "Free trial",
  days: 7,
  exports: 3, // in total, not per month
  watermark: true,
  blurb: "3 exports, every feature to try, watermarked. Pick a plan when you’re ready.",
} as const;

export const YEARLY_LABEL = "Save 17%";

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
};

export const PLANS: PlanConfig[] = [
  {
    id: "simple",
    name: "Simple",
    tagline: "For small shops posting now and then.",
    seats: 1,
    monthlyExports: 10,
    sharedExports: false,
    monthly: 35,
    yearly: null,
    team: false,
    features: ["1 seat", "10 exports a month", "9:16, 1:1 and 16:9", "MP4 and GIF", "Every Google Font", "Brand kit: logo, colors, fonts", "Duplicate with new photos", "Save as template", "No watermark"],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For brands posting every week.",
    seats: 1,
    monthlyExports: 50,
    sharedExports: false,
    monthly: 125,
    yearly: 1250,
    team: false,
    features: ["Everything in Simple", "50 exports a month"],
  },
  {
    id: "team",
    name: "Team",
    tagline: "For agencies and marketing teams.",
    seats: 4,
    monthlyExports: 150,
    sharedExports: true,
    monthly: 175,
    yearly: 1750,
    team: true,
    features: ["Everything in Business", "You + 3 teammates", "150 exports a month, shared", "Shared brand kits", "Shared templates", "Priority support"],
  },
];

export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Price text for a plan card in the chosen billing mode. */
export function priceFor(p: PlanConfig, billing: Billing) {
  if (billing === "yearly" && p.yearly != null) {
    const perMonth = Math.round(p.yearly / 12);
    const saved = p.monthly * 12 - p.yearly;
    return { price: usd(p.yearly), per: "/ year", note: `About ${usd(perMonth)} a month · save ${usd(saved)}` };
  }
  const note = billing === "yearly" ? "Monthly billing only" : p.seats > 1 ? `Billed monthly · ${p.seats} seats` : "Billed monthly";
  return { price: usd(p.monthly), per: "/ month", note };
}

export function signupHref(p: PlanConfig, billing: Billing) {
  const b = p.yearly == null ? "monthly" : billing;
  return `/signup?plan=${p.id}&billing=${b}`;
}

type Cell = string | boolean;
export type CompareRow = { label: string; cells: [Cell, Cell, Cell, Cell] }; // trial, simple, business, team
export type CompareGroup = { group: string; rows: CompareRow[] };

const S = planById("simple"), B = planById("business"), T = planById("team");
const priceCell = (p: PlanConfig) => (p.yearly ? `${usd(p.monthly)} / month|or ${usd(p.yearly)} / year` : `${usd(p.monthly)} / month`);

export const COMPARE: CompareGroup[] = [
  {
    group: "Plan",
    rows: [
      { label: "Price", cells: [`${TRIAL.days} days free`, priceCell(S), priceCell(B), priceCell(T)] },
      { label: "Seats", cells: ["1", String(S.seats), String(B.seats), String(T.seats)] },
      { label: "Exports a month", cells: [`${TRIAL.exports} in total`, String(S.monthlyExports), String(B.monthlyExports), `${T.monthlyExports}, shared`] },
      { label: "Watermark", cells: ["Yes", "No", "No", "No"] },
    ],
  },
  {
    group: "Create & export",
    rows: ["9:16, 1:1 and 16:9", "MP4", "GIF", "Every Google Font"].map((label) => ({ label, cells: [true, true, true, true] as [Cell, Cell, Cell, Cell] })),
  },
  {
    group: "Brand & reuse",
    rows: ["Brand kit", "Duplicate with new photos", "Save as template"].map((label) => ({ label, cells: [true, true, true, true] as [Cell, Cell, Cell, Cell] })),
  },
  {
    group: "Team",
    rows: ["Shared brand kits", "Shared templates", "Priority support"].map((label) => ({ label, cells: [false, S.team, B.team, T.team] as [Cell, Cell, Cell, Cell] })),
  },
];

export const FAQ = [
  { q: "Can I try it before paying?", a: `Yes. Every account starts with a ${TRIAL.days}-day free trial: ${TRIAL.exports} exports with every feature, watermarked. Choose a plan when you’re ready to remove the watermark and export more.` },
  { q: "What kind of photos work best?", a: "Clear product photos with some space around the product work best. Phone photos are fine: three to five of them make a good reel." },
  { q: "Which formats can I export?", a: "Every reel exports as 9:16 for Reels, Stories and TikTok, 1:1 for feeds and 16:9 for banners and YouTube, as MP4 or GIF." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from Account → Billing in the app whenever you like. You keep full access until the end of the period you've already paid for, and we don't charge you again." },
  { q: "Do I own the reels I make?", a: "Yes. Every reel you export is yours to use wherever you like, forever — including reels made during the free trial. We never claim any rights over your photos or your finished videos." },
  { q: "Do you offer discounts?", a: "Yearly billing already saves you 17% on Business and Team. If you're a nonprofit or a school, write to info@gravitypants.com and we'll see what we can do." },
];
