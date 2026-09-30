export type ExampleCategory = "fashion" | "food" | "beauty" | "home";
export type ExampleFormat = "916" | "11" | "169";
export type GalleryExample = {
  id: string; name: string; category: ExampleCategory; format: ExampleFormat;
  photos: number; seconds: number; headline: string; sub: string; frames: string[];
  // "top" matches the Purl Soho ad: light centered headline at the top, logo text near the bottom.
  layout?: "top";
  logo?: string;
  /** A real exported video plays instead of the drawn frames. */
  video?: string;
  videoWebm?: string;
  poster?: string;
  href?: string;
};

// Drawn reference reels are local stand-ins for future exported videos.
import purlPhoto1 from "@/assets/site/purl-soho-photo-1.png.asset.json";
import purlPhoto2 from "@/assets/site/purl-soho-photo-2.png.asset.json";
import purlPhoto3 from "@/assets/site/purl-soho-photo-3.png.asset.json";
import spotlightVideo from "@/assets/site/product-spotlight.mp4.asset.json";
import spotlightVideoWebm from "@/assets/site/product-spotlight.webm.asset.json";
import spotlightPoster from "@/assets/site/product-spotlight-poster.jpg.asset.json";
import bioshieldVideo from "@/assets/site/bioshield-collection.mp4.asset.json";
import bioshieldVideoWebm from "@/assets/site/bioshield-collection.webm.asset.json";
import bioshieldPoster from "@/assets/site/bioshield-collection-poster.jpg.asset.json";
import fallWinterVideo from "@/assets/site/fall-winter-collection.mp4.asset.json";
import fallWinterVideoWebm from "@/assets/site/fall-winter-collection.webm.asset.json";
import fallWinterPoster from "@/assets/site/fall-winter-collection-poster.jpg.asset.json";

export const galleryExamples: GalleryExample[] = [
  { id: "purl-soho", name: "Japanese Denim Cotton", category: "fashion", format: "916", photos: 3, seconds: 7.8, headline: 'Japanese Denim\nCotton', sub: 'A soft, springy cotton yarn', layout: "top", logo: "Purl Soho", frames: [purlPhoto1.url, purlPhoto2.url, purlPhoto3.url], href: "https://purlsoho.com" },
  { id: "aro", name: "AW 26-27 Collection", category: "fashion", format: "11", photos: 3, seconds: 6, headline: 'Meet AW 26-27 Collection', sub: 'aroshoes.com', video: spotlightVideo.url, videoWebm: spotlightVideoWebm.url, poster: spotlightPoster.url, frames: [] },
  { id: "sneaker", name: "Fall–Winter Collection", category: "fashion", format: "916", photos: 3, seconds: 8, headline: "Fall–Winter Collection", sub: "Agnona", video: fallWinterVideo.url, videoWebm: fallWinterVideoWebm.url, poster: fallWinterPoster.url, frames: [] },
  { id: "jewel", name: "Jewelry gift guide", category: "fashion", format: "169", photos: 3, seconds: 7.5, headline: 'Give something that lasts.', sub: 'Gift guide', frames: ["/site-art/gallery-jewel-1.svg", "/site-art/gallery-jewel-2.svg", "/site-art/gallery-jewel-3.svg"] },
  { id: "coffee", name: "Coffee subscription", category: "food", format: "916", photos: 3, seconds: 9, headline: 'Slow mornings.\nFast shipping.', sub: '[Roaster name]', frames: ["/site-art/gallery-coffee-1.svg", "/site-art/gallery-coffee-2.svg", "/site-art/gallery-coffee-3.svg"] },
  { id: "bakery", name: "Bakery weekend", category: "food", format: "11", photos: 3, seconds: 6, headline: 'Fresh out\nat 7am.', sub: 'Order ahead', frames: ["/site-art/gallery-bakery-1.svg", "/site-art/gallery-bakery-2.svg", "/site-art/gallery-bakery-3.svg"] },
  { id: "smoothie", name: "Smoothie bar menu", category: "food", format: "169", photos: 3, seconds: 7.5, headline: 'Blended to order.', sub: 'New summer menu', frames: ["/site-art/gallery-smoothie-1.svg", "/site-art/gallery-smoothie-2.svg", "/site-art/gallery-smoothie-3.svg"] },
  { id: "skincare", name: "Bioshield Collection", category: "beauty", format: "916", photos: 3, seconds: 9, headline: "Bioshield Collection", sub: "Sachajuan", video: bioshieldVideo.url, videoWebm: bioshieldVideoWebm.url, poster: bioshieldPoster.url, frames: [] },
  { id: "perfume", name: "Fragrance launch", category: "beauty", format: "11", photos: 3, seconds: 7.5, headline: 'Wear the\nevening.', sub: 'Eau de parfum', frames: ["/site-art/gallery-perfume-1.svg", "/site-art/gallery-perfume-2.svg", "/site-art/gallery-perfume-3.svg"] },
  { id: "candle", name: "Candle launch", category: "home", format: "916", photos: 3, seconds: 7.5, headline: 'Light up the\nlong nights.', sub: 'Winter scents', frames: ["/site-art/gallery-candle-1.svg", "/site-art/gallery-candle-2.svg", "/site-art/gallery-candle-3.svg"] },
  { id: "plants", name: "Plant shop promo", category: "home", format: "11", photos: 3, seconds: 7.5, headline: 'Bring the\noutside in.', sub: 'Delivered potted', frames: ["/site-art/gallery-plants-1.svg", "/site-art/gallery-plants-2.svg", "/site-art/gallery-plants-3.svg"] },
  { id: "chair", name: "Furniture sale", category: "home", format: "169", photos: 4, seconds: 8, headline: 'Sit back. Save more.', sub: '[Sale dates]', frames: ["/site-art/gallery-chair-1.svg", "/site-art/gallery-chair-2.svg", "/site-art/gallery-chair-3.svg"] },
];
