import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelVideo } from "@/components/site/ReelVideo";
import videoAsset from "@/assets/site/example-of-the-week.mp4.asset.json";
import webmAsset from "@/assets/site/example-of-the-week.webm.asset.json";
import posterAsset from "@/assets/site/example-of-the-week-poster.jpg.asset.json";

export function FeaturedAdVideo({ controls = false }: { controls?: boolean }) {
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const video = document.querySelector<HTMLVideoElement>(".featured-ad-phone video");
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  return <div className="site-phone site-phone-large featured-ad-phone">
    <div className="site-phone-screen">
      <ReelVideo
        video={videoAsset.url}
        videoWebm={webmAsset.url}
        poster={posterAsset.url}
        label="Purl Soho Japanese Denim Cotton video ad"
        onPlayingChange={setPlaying}
      />
      {controls && <Button type="button" variant="siteSecondary" size="icon" className="featured-ad-control" aria-label={playing ? "Pause featured ad" : "Play featured ad"} onClick={toggle}>
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </Button>}
    </div>
  </div>;
}
