import { useEffect, useRef } from "react";
import type { EditorDoc } from "@/lib/stillframe/data";
import type { Format } from "@/lib/stillframe/types";
import { FORMAT_SIZE } from "@/render/formats";
import { renderAt, restTime } from "@/render/renderFrame";
import { cn } from "@/lib/utils";

/** Small still of one frame, drawn by the same render engine as the preview. */
export function FrameThumb({
  doc,
  index,
  format,
  images,
  version,
  width,
  className,
}: {
  doc: EditorDoc;
  index: number;
  format: Format;
  images: Map<string, HTMLImageElement>;
  version: number;
  width: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = FORMAT_SIZE[format];
  const w = width;
  const h = Math.round((width * size.height) / size.width);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    renderAt(ctx, doc.project, doc.frames, format, restTime(doc.frames, index) + 0.4, {
      width: w,
      height: h,
      images,
    });
  }, [doc, index, format, images, version, w, h]);

  return <canvas ref={ref} width={w} height={h} className={cn("object-cover", className)} />;
}
