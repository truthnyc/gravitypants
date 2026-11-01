import { describe, it, expect } from "vitest";
import { videoSitemapXml } from "@/lib/site/video-sitemap";
const reel = { id: "r1", brand: "French Bloom", title: "Spritz", video: "https://x.co/storage/v1/object/sign/a.mp4?token=t", poster: "https://x.co/storage/v1/object/sign/a.jpg?token=t", uploadDate: "2026-10-01", seconds: 12, photos: 6, description: "Bubbles & fizz" } as never;
describe("video sitemap", () => {
  it("uses permanent reel links, never expiring signed links", () => {
    const xml = videoSitemapXml("https://gravitypants.com", [{ path: "/for/food-and-drink", reelIds: ["r1"] }], [reel]);
    expect(xml).toContain("<video:content_loc>https://gravitypants.com/api/public/reel/r1/video</video:content_loc>");
    expect(xml).toContain("<video:thumbnail_loc>https://gravitypants.com/api/public/reel/r1/poster</video:thumbnail_loc>");
    expect(xml).not.toContain("token=");
    expect(xml).toContain("Bubbles &amp; fizz");
  });
  it("leaves out pages whose reels are not published", () => {
    expect(videoSitemapXml("https://gravitypants.com", [{ path: "/x", reelIds: ["gone"] }], [reel])).not.toContain("<url>");
  });
});
