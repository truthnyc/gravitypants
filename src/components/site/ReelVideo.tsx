import { useEffect, useRef, useState } from "react";

export type ReelVideoSource = {
  /** MP4 URL. */
  video: string;
  /** Optional WebM URL, offered first for browsers without H.264. */
  videoWebm?: string | undefined;
  /** Still frame shown before the video loads. */
  poster?: string | undefined;
  label: string;
};

/**
 * A looping silent reel video that only downloads once it scrolls into view
 * (preload="none" plus an IntersectionObserver), pauses when it leaves the
 * viewport, and stays still for visitors who prefer reduced motion.
 */
export function ReelVideo({ video, videoWebm, poster, label, className, onPlayingChange, tabIndex, noFullscreen = false }: ReelVideoSource & {
  className?: string;
  onPlayingChange?: (playing: boolean) => void;
  tabIndex?: number;
  /** Set when the surrounding panel handles the click itself (play/pause in place). */
  noFullscreen?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || noFullscreen) return;
    const openFullscreen = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      element.muted = true;
      void element.play().catch(() => {});

      const iosVideo = element as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIos && typeof iosVideo.webkitEnterFullscreen === "function") {
        iosVideo.webkitEnterFullscreen();
      } else if (typeof element.requestFullscreen === "function") {
        void element.requestFullscreen().catch(() => {});
      } else {
        iosVideo.webkitEnterFullscreen?.();
      }
    };
    element.addEventListener("click", openFullscreen, true);
    return () => element.removeEventListener("click", openFullscreen, true);
  }, [noFullscreen]);


  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") { setActive(true); return; }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(true);
        else element.pause();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (preference.matches) { element.pause(); element.currentTime = 0; }
      else void element.play().catch(() => {});
    };
    // Sources render only once active, so wait for the element to pick them up.
    element.muted = true;
    element.defaultMuted = true;
    element.load();
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, [active]);

  return <video
    ref={ref}
    className={className}
    poster={poster}
    loop
    muted
    autoPlay
    playsInline
    preload="none"
    tabIndex={tabIndex}
    aria-label={label}
    onPlay={() => onPlayingChange?.(true)}
    onPause={() => onPlayingChange?.(false)}
  >
    {active && videoWebm && <source src={videoWebm} type="video/webm" />}
    {active && <source src={video} type="video/mp4" />}
  </video>;
}
