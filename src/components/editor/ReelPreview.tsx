import { useEffect, useMemo, useRef, useState } from "react";
import type { EditorDoc } from "@/lib/stillframe/data";
import { effectiveKit, useBrandKit, useBrandKits } from "@/lib/stillframe/data";
import type { Format } from "@/lib/stillframe/types";
import { END_CARD_SECONDS, endCardOf, restTime, videoDuration, frameIndexAt, type BrandStyle } from "@/render/renderFrame";
import { Stage } from "./Stage";
import { useRenderAssets } from "./use-editor";

/** Brand style for an ad, same as the editor uses. */
export function useAdBrand(doc: EditorDoc) {
  const { data: settings } = useBrandKit();
  const { data: kits } = useBrandKits();
  const named = kits?.find((k) => k.id === doc.project.brand_kit_id) ?? null;
  const kit = useMemo(() => (settings ? effectiveKit(settings, named) : settings), [settings, named]);
  return useMemo<BrandStyle>(
    () => ({ color: kit?.colors[0] ?? null, font: kit?.body_font ?? null, endCard: kit?.end_card ?? null }),
    [kit?.colors, kit?.body_font, kit?.end_card],
  );
}

/** Non-editable reel preview with playback, for the Photos, Export and Share steps' reel card. */
export function useReelPlayer(doc: EditorDoc) {
  const brand = useAdBrand(doc);
  const { images, version } = useRenderAssets(doc, brand);
  const [format, setFormat] = useState<Format>(doc.project.primary_format);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(() => restTime(doc.frames, 0));
  const total = videoDuration(doc.project, doc.frames, brand);
  const endSeconds = endCardOf(doc.project, brand).enabled ? END_CARD_SECONDS : 0;
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let stop = false;
      setTime((t) => (t + dt >= total ? ((stop = true), total) : t + dt));
      if (stop) return setPlaying(false);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total]);
  const toggle = () => setPlaying((p) => { if (!p && time >= total - 0.05) setTime(0); return !p; });
  const idx = Math.max(0, frameIndexAt(doc.frames, time));
  const preview = doc.frames.length ? (
    <Stage
      interactive={false}
      doc={doc} brand={brand} frameIndex={idx} format={format} time={time} playing={playing}
      selected="photo" images={images} version={version}
      onSelect={() => {}} onMove={() => {}} onText={() => {}} sizeOf={() => 0} onResize={() => {}} onFocus={() => {}} onAdjustDone={() => {}}
    />
  ) : (
    <div className="text-[14px] text-ap-muted">Add photos to see your reel</div>
  );
  return {
    preview, playing, toggle, time, total, format, setFormat, brand,
    segments: [...doc.frames.map((f) => f.duration_sec), ...(endSeconds ? [endSeconds] : [])],
  };
}
