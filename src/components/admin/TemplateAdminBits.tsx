import { MediaImage } from "@/components/stillframe/MediaImage";
import { PLAN_AUDIENCE } from "@/lib/stillframe/template-doc";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;
export const adminTemplatesKey = ["admin", "templates"] as const;
const RATIO: Record<string, [number, number]> = { "9:16": [20, 36], "1:1": [34, 34], "16:9": [40, 23] };

export function audienceLabel(a: string[] | null | undefined) {
  if (!a?.length) return "All users";
  return PLAN_AUDIENCE.filter(([k]) => a.includes(k)).map(([, l]) => l).join(", ");
}

export function TemplateThumb({ row, size = 48 }: { row: Row; size?: number }) {
  const [w, h] = RATIO[row.format ?? "9:16"] ?? [20, 36];
  const k = size / 48;
  const thumb: string | null = row.draft?.thumbnail_url ?? row.thumbnail_url;
  const bg = row.draft?.style?.background_color ?? row.style?.background_color ?? "#1D1D1F";
  return (
    <div className="flex shrink-0 items-center justify-center rounded-sm bg-canvas" style={{ width: size, height: size }}>
      <span className="relative block overflow-hidden rounded-[2px]" style={{ width: w * k, height: h * k, background: bg }}>
        {thumb && !thumb.startsWith("/") && <MediaImage path={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </span>
    </div>
  );
}

