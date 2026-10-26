import { describe, expect, it } from "vitest";
import { optimizedPublicVideo } from "../src/lib/site/public-media";
import oldFall from "../src/assets/site/fall-winter-collection.mp4.asset.json";
import fall from "../src/assets/site/fall-winter-collection-optimized.mp4.asset.json";
import oldJewelry from "../src/assets/site/fine-jewelry-gifts.mp4.asset.json";
import jewelry from "../src/assets/site/fine-jewelry-gifts-optimized.mp4.asset.json";
import oldSpotlight from "../src/assets/site/product-spotlight.mp4.asset.json";
import spotlight from "../src/assets/site/product-spotlight-optimized.mp4.asset.json";

describe("public media optimization", () => {
  for (const [original, variant] of [[oldFall, fall], [oldJewelry, jewelry], [oldSpotlight, spotlight]]) {
    it(`replaces only the exact ${original.original_filename} asset with a smaller MP4`, () => {
      expect(optimizedPublicVideo(original.url)).toBe(variant.url);
      expect(variant.size).toBeLessThan(original.size * 0.25);
      expect(variant.content_type).toBe("video/mp4");
    });
  }
  it("preserves signed/private and newly uploaded media URLs", () => {
    for (const url of ["site-reels:workspace/new.mp4", "https://storage.example/media/workspace/reel.mp4?token=private", "/__l5e/assets-v1/new/upload.mp4", oldFall.url + "?token=private"]) {
      expect(optimizedPublicVideo(url)).toBe(url);
    }
  });
});