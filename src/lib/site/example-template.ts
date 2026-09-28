import { galleryExamples } from "./examples";
import { DEFAULT_LOGO, type Format } from "@/lib/stillframe/types";
import type { Template } from "@/lib/stillframe/data";

/** Example gallery styles contain no customer photos; the user's uploads fill these frames. */
export function templateForExample(id: string): Template | null {
  const example = galleryExamples.find((item) => item.id === id);
  if (!example) return null;
  const format: Format = example.format === "916" ? "9:16" : example.format === "11" ? "1:1" : "16:9";
  return {
    id: `example-${example.id}`, workspace_id: "", created_by: "", name: example.name,
    thumbnail_url: null, visibility: "private", updated_at: "",
    settings: {
      formats: [format], primary_format: format, pace: "standard", logo: DEFAULT_LOGO,
      end_card: {}, frame_count: example.photos,
      frames: Array.from({ length: example.photos }, (_, index) => ({
        duration_sec: example.seconds / example.photos,
        transition_in: { type: index === 0 ? "cut" as const : "fade" as const, speed: "smooth" as const },
        photo: { fit: "fill" as const, focus: { x: 0.5, y: 0.5 }, movement: "slow_zoom_in" as const, darken_for_text: index === 0 },
        headline: index === 0 ? { text: example.headline, size_px: 100, color: "#FFFFFF", animation: "rise" as const, position: "center" } : null,
        subline: index === 0 ? { text: example.sub, size_px: 48, color: "#FFFFFF", animation: "fade" as const, position: "bottom-center" } : null,
        logo_visible: true,
      })),
    },
  };
}