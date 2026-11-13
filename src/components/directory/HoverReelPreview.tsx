import { useEffect, useRef, useState } from "react";

/** Silent, on-demand playback; the surrounding thumbnail still opens the reel. */
export function HoverReelPreview({ video, poster, className, alt = "" }: {
  video: string | null; poster: string | null; className: string; alt?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Only fetch the video after a deliberate pause on the tile, so sweeping the cursor across the grid downloads nothing.
  const intent = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    if (!video) return;
    if (intent.current) clearTimeout(intent.current);
    intent.current = setTimeout(() => { setLoaded(true); setActive(true); }, 350);
  };
  useEffect(() => () => { if (intent.current) clearTimeout(intent.current); }, []);
  const stop = () => {
    if (intent.current) { clearTimeout(intent.current); intent.current = null; }
    setActive(false);
    setPlaying(false);
    const element = ref.current;
    if (element) {
      element.pause();
      if (element.readyState > 0) element.currentTime = 0;
    }
  };

  useEffect(() => {
    const element = ref.current;
    if (!active || !element) return;
    let cancelled = false;
    element.muted = true;
    void element.play().then(() => {
      if (cancelled) element.pause();
    }).catch(() => setPlaying(false));
    return () => { cancelled = true; element.pause(); };
  }, [active, loaded, video]);

  return <div className="absolute inset-0" onPointerEnter={(event) => {
    if (event.pointerType !== "touch") start();
  }} onPointerLeave={stop}>
    {video && loaded && <video ref={ref} src={video} poster={poster ?? undefined}
      className={className} muted loop playsInline preload="none" aria-hidden
      onPlaying={() => setPlaying(active)} onError={() => setPlaying(false)} />}
    {poster && <img src={poster} alt={alt} aria-hidden={alt ? undefined : true} loading="lazy"
      className={`${className}${active && playing ? " invisible" : ""}`} />}
  </div>;
}