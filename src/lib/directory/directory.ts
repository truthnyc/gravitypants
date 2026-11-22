/** Shared Directory constants (client- and server-safe). */
/** Visitor order first, then admin-only. Must match the directory_brands_category_check constraint. */
export const PUBLIC_CATEGORIES = [
  "Fashion", "Sports & Outdoor", "Jewelry & Watches", "Beauty & Fragrance", "Home & Living", "Crafts & Making", "Food & Drink",
  "Wellness", "Travel & Stays", "Kids & Family", "Pets", "Art & Photography", "Local Services", "Nonprofit & Events",
] as const;
/** Kept for staff (admin forms) but never listed to visitors. */
export const ADMIN_ONLY_CATEGORIES = ["Real Estate", "Other"] as const;
export const CATEGORIES = [...PUBLIC_CATEGORIES, ...ADMIN_ONLY_CATEGORIES] as const;
export type Category = (typeof CATEGORIES)[number];
export const isPublicCategory = (c: string) => (PUBLIC_CATEGORIES as readonly string[]).includes(c);
export const SUBCATEGORIES: Partial<Record<Category, readonly string[]>> = {
  Fashion: ["Menswear", "Womenswear", "Knitwear", "Shoes & Bags", "Accessories"],
  "Food & Drink": ["Producers", "Restaurants & Cafés", "Wine & Spirits"],
};
export const CATEGORY_COVERS: Record<Category, string> = {
  Fashion: "Menswear, womenswear, knitwear, shoes, bags and accessories",
  "Sports & Outdoor": "Ski, hike, ride, sail and train",
  "Jewelry & Watches": "Fine jewelry, everyday pieces and timepieces",
  "Beauty & Fragrance": "Skincare, body care, makeup and scent",
  "Home & Living": "Furniture, objects, textiles and tableware",
  "Crafts & Making": "Yarn, patterns, tools and materials",
  "Food & Drink": "Producers, restaurants, cafés, wine and spirits",
  Wellness: "Movement, rest, care and studios",
  "Travel & Stays": "Hotels, retreats, guided trips and experiences",
  "Kids & Family": "Clothing, toys, nursery and family goods",
  Pets: "Gear, food, beds and care for animals",
  "Art & Photography": "Prints, originals, photography and studios",
  "Local Services": "Studios, ateliers, repairs and appointments",
  "Nonprofit & Events": "Charities, causes, festivals and fundraisers",
  "Real Estate": "Listings, developments, agents",
  Other: "Everything else",
};
/** Old category names (before the 2026-11 restructure) and the category each moved to. */
export const LEGACY_CATEGORY_NAMES: Record<string, Category> = {
  "Fashion & Apparel": "Fashion", "Crafts & Hobbies": "Crafts & Making", "Health & Wellness": "Wellness",
  "Services & Local Business": "Local Services", "Travel & Hospitality": "Travel & Stays",
  "Photography & Visual Arts": "Art & Photography", "Nonprofit & Causes": "Nonprofit & Events",
  "Events & Entertainment": "Nonprofit & Events", "Restaurants & Cafés": "Food & Drink", "Wine & Spirits": "Food & Drink",
};
export const categorySlug = (c: string) =>
  c.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const categoryFromSlug = (s: string): Category | null => CATEGORIES.find((c) => categorySlug(c) === s) ?? null;
/** Old category slug -> its current slug (null when the slug is already current or unknown). */
export const legacyCategorySlug = (s: string): string | null => {
  const hit = Object.entries(LEGACY_CATEGORY_NAMES).find(([old]) => categorySlug(old) === s);
  return hit ? categorySlug(hit[1]) : null;
};
/** Moods live in the database (moods + category_moods); see src/lib/directory/moods.ts. Stored lowercase. */
export type Mood = string;
/** Safety ceiling only — brands may pick as many moods as fit; the whole catalog is ~60. */
export const BRAND_MOODS_MAX = 60;
export const moodLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);
export const RESERVED_SLUGS = ["directory", "admin", "category", "search", "new", "edit", "api", "app"];
export const WORDING_VERSION = "v1.1";
export const GRACE_DAYS = 30;
export const BRAND_NAME_MAX = 50;
export const BRAND_DESCRIPTION_MAX = 300;
export const REEL_DESCRIPTION_MAX = 300;
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
    beauty: "Beauty & Fragrance", food: "Food & Drink",
    home: "Home & Living", travel: "Travel & Stays", "travel-photography": "Travel & Stays",
    nonprofits: "Nonprofit & Events", "arts-crafts-hobbies": "Crafts & Making",
  };
  const legacy = legacyCategorySlug(slug);
  return categoryFromSlug(legacy ?? slug) ?? LEGACY_CATEGORY_NAMES[value] ?? aliases[slug] ?? null;
}
