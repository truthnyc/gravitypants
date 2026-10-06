/** Shared Directory constants (client- and server-safe). */
/** A–Z, with Other last. Must match the directory_brands_category_check constraint. */
export const CATEGORIES = [
  "Arts, Crafts & Hobbies", "Beauty & Fragrance", "Events & Entertainment", "Fashion & Apparel", "Food & Drink",
  "Health & Wellness", "Home & Living", "Jewelry & Watches", "Kids & Family", "Nonprofit & Causes", "Pets",
  "Real Estate", "Restaurants & Cafés", "Services & Local Business", "Travel & Hospitality", "Wine & Spirits", "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_COVERS: Record<Category, string> = {
  "Arts, Crafts & Hobbies": "Yarn, craft supplies, galleries, artists",
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
/** Master mood list (stored lowercase). Search draws from all of it. */
export const MOODS = ["airy", "bold", "calm", "celebratory", "cheerful", "cinematic", "clean", "coastal", "cozy", "dramatic", "dreamy", "earthy", "edgy", "elegant", "empowering", "energetic", "energizing", "festive", "fresh", "fun", "heartfelt", "heritage", "homey", "hopeful", "human", "indulgent", "inspiring", "luxurious", "minimal", "modern", "moody", "mysterious", "natural", "nostalgic", "opulent", "organic", "playful", "quirky", "refined", "romantic", "rustic", "sensual", "serene", "sleek", "soft", "soothing", "sophisticated", "sunny", "timeless", "trustworthy", "urban", "urgent", "vibrant", "warm", "whimsical"] as const;
export type Mood = (typeof MOODS)[number];
/** Moods offered per category; Other gets every mood. */
export const CATEGORY_MOODS: Record<Exclude<Category, "Other">, Mood[]> = {
  "Fashion & Apparel": ["elegant", "luxurious", "bold", "edgy", "minimal", "urban", "timeless", "playful", "moody", "romantic"],
  "Jewelry & Watches": ["elegant", "luxurious", "timeless", "romantic", "refined", "opulent", "minimal", "sophisticated", "festive"],
  "Beauty & Fragrance": ["luxurious", "sensual", "soothing", "fresh", "clean", "dreamy", "elegant", "mysterious", "soft", "bold"],
  "Health & Wellness": ["soothing", "calm", "fresh", "natural", "energetic", "empowering", "clean", "serene", "organic"],
  "Food & Drink": ["indulgent", "warm", "cozy", "fresh", "playful", "rustic", "heritage", "vibrant", "festive", "homey"],
  "Wine & Spirits": ["elegant", "rustic", "heritage", "warm", "sophisticated", "moody", "celebratory", "timeless", "earthy"],
  "Restaurants & Cafés": ["cozy", "warm", "vibrant", "urban", "rustic", "indulgent", "fresh", "homey", "fun"],
  "Home & Living": ["cozy", "serene", "minimal", "warm", "refined", "natural", "earthy", "timeless", "homey", "airy"],
  "Travel & Hospitality": ["serene", "coastal", "sunny", "dreamy", "luxurious", "cinematic", "romantic", "airy", "natural"],
  "Real Estate": ["elegant", "modern", "airy", "serene", "luxurious", "sleek", "warm", "trustworthy", "coastal"],
  "Arts, Crafts & Hobbies": ["cozy", "playful", "whimsical", "natural", "nostalgic", "calm", "vibrant", "homey", "inspiring"],
  "Kids & Family": ["playful", "cheerful", "fun", "whimsical", "soft", "warm", "sunny", "heartfelt"],
  "Pets": ["playful", "cheerful", "fun", "heartfelt", "warm", "quirky", "cozy", "sunny"],
  "Events & Entertainment": ["energetic", "bold", "festive", "celebratory", "urgent", "cinematic", "dramatic", "vibrant", "fun"],
  "Services & Local Business": ["trustworthy", "clean", "modern", "warm", "cheerful", "bold", "minimal", "human"],
  "Nonprofit & Causes": ["heartfelt", "hopeful", "inspiring", "human", "urgent", "empowering", "trustworthy", "calm"],
};
export const BRAND_MOODS_MAX = 3;
export const moodsFor = (c: string): readonly Mood[] => (CATEGORY_MOODS as Record<string, Mood[]>)[c] ?? MOODS.filter((m) => !(["energizing"] as string[]).includes(m));
export const moodLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);
export const RESERVED_SLUGS = ["directory", "admin", "category", "search", "new", "edit", "api", "app"];
export const WORDING_VERSION = "v1.0";
export const GRACE_DAYS = 30;
export const BRAND_NAME_MAX = 50;
export const BRAND_DESCRIPTION_MAX = 300;
export const REEL_DESCRIPTION_MAX = 120;
export const SLUG_MAX = 30;

export const nearLimit = (length: number, limit: number) => length >= Math.ceil(limit * 0.85);

export function permissionWording(brand: string) {
  return `I confirm that I'm authorized to act for ${brand}, and that we own or have permission to use the photos, logo, words and music in this reel. I give Gravity Pants permission to publish it in the Gravity Pants Directory and on our brand page, with a link to our website. I understand that other people can start their own reel from its template (never our photos, logo, words, colors or fonts), and that we can remove it from the Directory at any time.`;
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
