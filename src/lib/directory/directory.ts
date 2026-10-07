/** Shared Directory constants (client- and server-safe). */
/** A–Z, with Other last. Must match the directory_brands_category_check constraint. */
export const CATEGORIES = [
  "Beauty & Fragrance", "Crafts & Hobbies", "Events & Entertainment", "Fashion & Apparel", "Food & Drink",
  "Health & Wellness", "Home & Living", "Jewelry & Watches", "Kids & Family", "Nonprofit & Causes", "Pets",
  "Photography & Visual Arts", "Real Estate", "Restaurants & Cafés", "Services & Local Business", "Travel & Hospitality", "Wine & Spirits", "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_COVERS: Record<Category, string> = {
  "Crafts & Hobbies": "Yarn, craft supplies, handmade goods, hobbies",
  "Beauty & Fragrance": "Skincare, makeup, perfume, hair",
  "Events & Entertainment": "Venues, concerts, festivals, weddings",
  "Fashion & Apparel": "Clothing, shoes, bags, knitwear",
  "Food & Drink": "Chocolate, coffee, bakeries, packaged food",
  "Health & Wellness": "Supplements, fitness, spas, yoga",
  "Home & Living": "Furniture, decor, textiles, candles",
  "Jewelry & Watches": "Fine jewelry, watches, accessories",
  "Kids & Family": "Toys, baby goods, children's fashion",
  "Nonprofit & Causes": "Charities, NGOs, fundraisers",
  Pets: "Pet food, accessories, grooming",
  "Photography & Visual Arts": "Photography, galleries, artists, visual art",
  "Real Estate": "Listings, developments, agents",
  "Restaurants & Cafés": "Menus, specials, openings",
  "Services & Local Business": "Salons, studios, agencies, shops",
  "Travel & Hospitality": "Hotels, villas, tours, destinations",
  "Wine & Spirits": "Wineries, breweries, distilleries",
  Other: "Everything else",
};
export const categorySlug = (c: string) =>
  c.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const categoryFromSlug = (s: string): Category | null => CATEGORIES.find((c) => categorySlug(c) === s) ?? null;
/** Moods live in the database (moods + category_moods); see src/lib/directory/moods.ts. Stored lowercase. */
export type Mood = string;
export const BRAND_MOODS_MAX = 3;
export const moodLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);
export const RESERVED_SLUGS = ["directory", "admin", "category", "search", "new", "edit", "api", "app"];
export const WORDING_VERSION = "v1.1";
export const GRACE_DAYS = 30;
export const BRAND_NAME_MAX = 50;
export const BRAND_DESCRIPTION_MAX = 300;
export const REEL_DESCRIPTION_MAX = 120;
export const SLUG_MAX = 30;

export const nearLimit = (length: number, limit: number) => length >= Math.ceil(limit * 0.85);

export function permissionWording(brand: string) {
  return `I confirm that I'm authorized to act for ${brand}, and that we own or have permission to use the photos, logo, words and music in this reel. I give Gravity Pants permission to publish it on Aimanté (aimante.co), including its directory and our brand page, and on the Gravity Pants Showcase and Examples pages, with a link to our website. I understand that other people can start their own reel from its template (never our photos, logo, words, colors or fonts), and that we can withdraw this sharing permission at any time.`;
}

export function toSlug(name: string) {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, SLUG_MAX).replace(/-+$/, "");
  return s.length >= 3 ? s : `${s || "brand"}-reels`.slice(0, SLUG_MAX);
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
  video: string | null;
  title: string | null;
  template_name: string | null;
  template_id: string | null;
  featured: boolean;
  seconds: number;
  photos: number;
  description: string | null;
  website_url: string | null;
};
export const ratio = (f: string) => f.replace("x", ":");

/** Resolve old website-reel values to the shared taxonomy. */
export function normalizeCategory(value: string): Category | null {
  const slug = categorySlug(value);
  const aliases: Record<string, Category> = {
    fashion: "Fashion & Apparel", beauty: "Beauty & Fragrance", food: "Food & Drink",
    home: "Home & Living", travel: "Travel & Hospitality", "travel-photography": "Travel & Hospitality",
    nonprofits: "Nonprofit & Causes", "arts-crafts-hobbies": "Crafts & Hobbies",
  };
  return categoryFromSlug(slug) ?? aliases[slug] ?? null;
}
