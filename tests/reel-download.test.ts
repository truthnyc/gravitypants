import { describe, it, expect } from "vitest";
import { reelDownloadUrl } from "@/lib/site/reel-download";
describe("reelDownloadUrl", () => {
  it("adds a download name to stored files and keeps the token", () => {
    const u = reelDownloadUrl("https://x.supabase.co/storage/v1/object/sign/media/a.mp4?token=abc", "French Bloom!");
    expect(u).toBe("https://x.supabase.co/storage/v1/object/sign/media/a.mp4?token=abc&download=french-bloom.mp4");
  });
  it("returns nothing when there is no video", () => {
    expect(reelDownloadUrl(null, "x")).toBeNull();
  });
});
