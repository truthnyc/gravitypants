import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ReelVideoSource = {
  /** MP4 URL. */
  video: string;
  /** Optional WebM URL, offered first for browsers without H.264. */
  videoWebm?: string | undefined;
  /** Still frame shown before the video loads. */
  poster?: string | undefined;
  label: string;
};

/** Phones and tablets keep the native player; larger screens get the in-window overlay. */
function isHandheld() {
  if (typeof window === "undefined") return false;
  if (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent)) return true;
  return window.matchMedia("(max-width: 767px)").matches;
}

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
  const [overlay, setOverlay] = useState(false);

  const closeOverlay = useCallback(() => setOverlay(false), []);

  useEffect(() => {
    const element = ref.current;
    if (!element || noFullscreen) return;
    const openPlayer = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      element.muted = true;

      const iosVideo = element as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
      if (isHandheld()) {
        void element.play().catch(() => {});
        if (typeof iosVideo.webkitEnterFullscreen === "function") iosVideo.webkitEnterFullscreen();
        else if (typeof element.requestFullscreen === "function") void element.requestFullscreen().catch(() => {});
        return;
      }
      // Desktop: play inside the page, not across the whole screen.
      setOverlay(true);
    };
    element.addEventListener("click", openPlayer, true);
    return () => element.removeEventListener("click", openPlayer, true);
  }, [noFullscreen]);

  useEffect(() => {
    if (!overlay) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeOverlay(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [overlay, closeOverlay]);

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

  return <>
    <video
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
    </video>
    {overlay && typeof document !== "undefined" && createPortal(
      <div className="reel-overlay" role="dialog" aria-modal="true" aria-label={label} onClick={closeOverlay}>
        <button type="button" className="reel-overlay-close" aria-label="Close video" onClick={closeOverlay}>
          <X size={22} strokeWidth={1.7} />
        </button>
        <video
          className="reel-overlay-video"
          poster={poster}
          autoPlay
          loop
          controls
          playsInline
          onClick={event => event.stopPropagation()}
        >
          {videoWebm && <source src={videoWebm} type="video/webm" />}
          <source src={video} type="video/mp4" />
        </video>
      </div>,
      document.body,
    )}
  </>;
}
