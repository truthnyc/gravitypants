/** Shared Directory constants (client- and server-safe). */
export const CATEGORIES = ["Fashion", "Beauty", "Food & Drink", "Home", "Travel & Photography", "Nonprofits", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const MOODS = ["soothing", "cozy", "calm", "playful", "energizing", "luxurious", "elegant", "hopeful", "warm", "bold"] as const;
export const RESERVED_SLUGS = ["directory", "admin", "search", "new", "edit", "api", "app"];
export const WORDING_VERSION = "v1.0";
export const GRACE_DAYS = 30;

export function permissionWording(brand: string) {
  return `I confirm that I'm authorized to act for ${brand}, and that we own or have permission to use the photos, logo, words and music in this reel. I give Gravity Pants permission to publish it in the Gravity Pants Directory and on our brand page, with a link to our website. I understand that other people can start their own reel from its template (never our photos, logo, words, colors or fonts), and that we can remove it from the Directory at any time.`;
}

export function toSlug(name: string) {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  return s.length >= 3 ? s : `${s || "brand"}-reels`.slice(0, 40);
}

export const validFullName = (n: string) => n.trim().split(/\s+/).filter((w) => w.length > 0).length >= 2;

export type DirStatus = "private" | "in_review" | "live" | "hidden";
export const STATUS_LABEL: Record<DirStatus, string> = { private: "Private", in_review: "In review", live: "Live in the Directory", hidden: "Hidden" };
export type PlanTag = "business" | "simple" | "trial" | "ended";

export type ShareBrand = {
  id: string | null;
  name: string;
  website_url: string;
  category: Category;
  description: string;
  slug: string;
  first_approved_at: string | null;
};

export type DirectoryCard = {
  reel_id: string;
  brand_name: string;
  brand_slug: string;
  category: string;
  tags: string[];
  moods: string[];
  formats: string[];
  poster: string | null;
  template_name: string | null;
  template_id: string | null;
  featured: boolean;
  seconds: number;
  photos: number;
  description: string | null;
  website_url: string | null;
};
export const ratio = (f: string) => f.replace("x", ":");
