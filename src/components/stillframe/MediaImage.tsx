import { useEffect, useState, type CSSProperties } from "react";
import { getMediaUrl } from "@/lib/stillframe/media";

/** <img> for a private media path (resolved to a short-lived signed URL). */
export function MediaImage({ path, alt, className, style }: { path: string; alt: string; className?: string; style?: CSSProperties }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getMediaUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  return url ? <img src={url} alt={alt} className={className} style={style} draggable={false} /> : null;
}
