import oldFall from "@/assets/site/fall-winter-collection.mp4.asset.json";
import fall from "@/assets/site/fall-winter-collection-optimized.mp4.asset.json";
import oldJewelry from "@/assets/site/fine-jewelry-gifts.mp4.asset.json";
import jewelry from "@/assets/site/fine-jewelry-gifts-optimized.mp4.asset.json";
import oldSpotlight from "@/assets/site/product-spotlight.mp4.asset.json";
import spotlight from "@/assets/site/product-spotlight-optimized.mp4.asset.json";

// Exact immutable public URLs only: private/signed media and later uploads pass through.
const variants = new Map([
  [oldFall.url, fall.url],
  [oldJewelry.url, jewelry.url],
  [oldSpotlight.url, spotlight.url],
]);

export function optimizedPublicVideo(url: string): string {
  return variants.get(url) ?? url;
}