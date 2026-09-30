import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelVideo } from "@/components/site/ReelVideo";
import videoAsset from "@/assets/site/example-of-the-week.mp4.asset.json";
import webmAsset from "@/assets/site/example-of-the-week.webm.asset.json";
import posterAsset from "@/assets/site/example-of-the-week-poster.webp.asset.json";

export function FeaturedAdVideo({ controls = false, video = videoAsset.url, videoWebm = webmAsset.url, poster = posterAsset.url, label = "Purl Soho Japanese Denim Cotton video ad", format = "916" }: { controls?: boolean; video?: string; videoWebm?: string; poster?: string; label?: string; format?: "916" | "169" }) {
  const [playing, setPlaying] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const element = phoneRef.current?.querySelector("video");
    if (!element) return;
    if (element.paused) void element.play().catch(() => setPlaying(false));
    else element.pause();
  };

  return <div ref={phoneRef} className={`site-phone site-phone-large featured-ad-phone featured-ad-${format}`}>
    <div className="site-phone-screen">
      <ReelVideo
         video={video}
         videoWebm={videoWebm}
         poster={poster}
         label={label}
        onPlayingChange={setPlaying}
      />
      {controls && <Button type="button" variant="siteSecondary" size="icon" className="featured-ad-control" aria-label={playing ? "Pause featured ad" : "Play featured ad"} onClick={toggle}>
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </Button>}
    </div>
  </div>;
}
