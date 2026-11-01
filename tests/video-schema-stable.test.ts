import { describe, it, expect } from "vitest";
import { videoObjects } from "@/lib/site/video-schema";

const reel = { id: "abc", brand: "B", title: "T", seconds: 6, photos: 3, uploadDate: "2026-10-01",
  video: "https://x.supabase.co/storage/v1/object/sign/site-reels/a.mp4?token=t",
  poster: "https://x.supabase.co/storage/v1/object/sign/site-reels/a.jpg?token=t" } as any;

describe("video schema", () => {
  it("uses permanent reel links instead of expiring signed links", () => {
    const [v] = videoObjects([reel], "/p") as any[];
    expect(v.contentUrl).toMatch(/\/api\/public\/reel\/abc\/video$/);
    expect(v.thumbnailUrl).toMatch(/\/api\/public\/reel\/abc\/poster$/);
  });
});
