import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import videoAsset from "@/assets/site/example-of-the-week.mp4.asset.json";
import posterAsset from "@/assets/site/example-of-the-week-poster.jpg.asset.json";

export function FeaturedAdVideo({ controls = false }: { controls?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (preference.matches) {
        video.pause();
        video.currentTime = 0;
      } else {
        void video.play().catch(() => setPlaying(false));
      }
    };
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  return <div className="site-phone site-phone-large featured-ad-phone">
    <div className="site-phone-screen">
      <video
        ref={videoRef}
        src={videoAsset.url}
        poster={posterAsset.url}
        loop
        muted
        playsInline
        preload="metadata"
        aria-label="Purl Soho Japanese Denim Cotton video ad"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {controls && <Button type="button" variant="siteSecondary" size="icon" className="featured-ad-control" aria-label={playing ? "Pause featured ad" : "Play featured ad"} onClick={toggle}>
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </Button>}
    </div>
  </div>;
}