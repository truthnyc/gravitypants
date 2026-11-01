import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { getEmbedReel } from "@/lib/site/embed-reel.functions";

/** A published reel on its own, sized to fit inside another website's frame. */
export const Route = createFileRoute("/embed/reel/$id")({
  loader: async ({ params }) => getEmbedReel({ data: { id: params.id } }).catch(() => null),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — ${loaderData.brand}` : "Reel not available" },
      // A player for other people's pages, never a page of its own in search.
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmbedReelPage,
});

function EmbedReelPage() {
  const reel = Route.useLoaderData();
  const video = useRef<HTMLVideoElement>(null);

  // The reel plays on its own for everyone else; someone who asked for less movement sees it still.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) video.current?.pause();
  }, []);

  if (!reel?.video) {
    return (
      <div className="grid h-dvh w-full place-items-center bg-ap-ink px-6 text-center">
        <p className="text-[14px] text-ap-card">This reel isn't available right now.</p>
      </div>
    );
  }

  return (
    <div className="relative grid h-dvh w-full place-items-center overflow-hidden bg-ap-ink">
      <video ref={video} className="absolute inset-0 object-contain" style={{ width: "100%", height: "100%" }} src={reel.video} poster={reel.poster ?? undefined} controls autoPlay loop muted playsInline preload="metadata" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ap-ink/85 to-transparent px-3 pb-2 pt-8">
        <span className="min-w-0 truncate text-[12px] text-ap-card/90">{reel.brand}</span>
        <a href="https://gravitypants.com" target="_blank" rel="noreferrer" data-cta="embed-credit"
          className="pointer-events-auto shrink-0 text-[12px] text-ap-card/80 underline-offset-2 hover:underline">
          Make yours with Gravity Pants
        </a>
      </div>
    </div>
  );
}
