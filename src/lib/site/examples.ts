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
import purlPhoto1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import purlPhoto2 from "@/assets/site/purl-soho-photo-2.webp.asset.json";
import purlPhoto3 from "@/assets/site/purl-soho-photo-3.webp.asset.json";
import spotlightVideo from "@/assets/site/product-spotlight.mp4.asset.json";
import spotlightVideoWebm from "@/assets/site/product-spotlight.webm.asset.json";
import spotlightPoster from "@/assets/site/product-spotlight-poster.webp.asset.json";
import bioshieldVideo from "@/assets/site/bioshield-collection.mp4.asset.json";
import bioshieldVideoWebm from "@/assets/site/bioshield-collection.webm.asset.json";
import bioshieldPoster from "@/assets/site/bioshield-collection-poster.webp.asset.json";
import fallWinterVideo from "@/assets/site/fall-winter-collection.mp4.asset.json";
import fallWinterVideoWebm from "@/assets/site/fall-winter-collection.webm.asset.json";
import fallWinterPoster from "@/assets/site/fall-winter-collection-poster.webp.asset.json";
import fineJewelryVideo from "@/assets/site/fine-jewelry-gifts.mp4.asset.json";
import fineJewelryVideoWebm from "@/assets/site/fine-jewelry-gifts.webm.asset.json";
import fineJewelryPoster from "@/assets/site/fine-jewelry-gifts-poster.webp.asset.json";

export const galleryExamples: GalleryExample[] = [
  { id: "purl-soho", name: "Japanese Denim Cotton", category: "fashion", format: "916", photos: 3, seconds: 7.8, headline: 'Japanese Denim\nCotton', sub: 'A soft, springy cotton yarn', layout: "top", logo: "Purl Soho", frames: [purlPhoto1.url, purlPhoto2.url, purlPhoto3.url], href: "https://purlsoho.com" },
  { id: "aro", name: "AW 26-27 Collection", category: "fashion", format: "11", photos: 3, seconds: 6, headline: 'Meet AW 26-27 Collection', sub: 'aroshoes.com', video: spotlightVideo.url, videoWebm: spotlightVideoWebm.url, poster: spotlightPoster.url, frames: [], href: "https://aroshoes.com/" },
  { id: "sneaker", name: "Fall–Winter Collection", category: "fashion", format: "916", photos: 3, seconds: 8, headline: "Fall–Winter Collection", sub: "Agnona", video: fallWinterVideo.url, videoWebm: fallWinterVideoWebm.url, poster: fallWinterPoster.url, frames: [], href: "https://agnona.com" },
  { id: "jewel", name: "Fine Jewelry Gifts", category: "fashion", format: "169", photos: 3, seconds: 8, headline: "Jewelry inspired by antiquities", sub: "Katherine Grover Fine Jewelry", video: fineJewelryVideo.url, videoWebm: fineJewelryVideoWebm.url, poster: fineJewelryPoster.url, frames: [], href: "https://www.katherinegroverfinejewelry.com" },
  { id: "skincare", name: "Bioshield Collection", category: "beauty", format: "916", photos: 3, seconds: 9, headline: "Bioshield Collection", sub: "Sachajuan", video: bioshieldVideo.url, videoWebm: bioshieldVideoWebm.url, poster: bioshieldPoster.url, frames: [], href: "https://shop.sachajuan.com" },
];
