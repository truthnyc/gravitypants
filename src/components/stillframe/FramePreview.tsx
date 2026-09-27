import { useQuery } from "@tanstack/react-query";
import { getMediaUrl } from "@/lib/stillframe/media";
import { FORMAT_RATIO, type Format, type Frame } from "@/lib/stillframe/types";

export function FramePreview({ frame, format }: { frame: Frame; format: Format }) {
  const path = frame.photo?.path ?? null;
  const { data: url } = useQuery({
    queryKey: ["media-url", path],
    enabled: Boolean(path),
    staleTime: 45 * 60 * 1000,
    queryFn: () => getMediaUrl(path!),
  });

  return (
    <div
      className="h-full overflow-hidden rounded-sm bg-control-fill"
      style={{
        aspectRatio: String(FORMAT_RATIO[format]),
        backgroundColor: frame.photo?.background_color ?? undefined,
      }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
}
