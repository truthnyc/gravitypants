import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { getClientReel } from "@/lib/stillframe/client-reel.functions";

const reelQuery = (key: string) =>
  queryOptions({ queryKey: ["client-reel", key], queryFn: () => getClientReel({ data: { workspaceId: getWorkspaceId(), key } }), staleTime: 30 * 60_000 });

export const Route = createFileRoute("/_authenticated/app/reel/$key")({
  head: () => ({
    meta: [
      { title: "Your reel — Gravity Pants" },
      { name: "description", content: "Watch your finished reel, see how each photo moves, and download the video." },
      { property: "og:title", content: "Your reel — Gravity Pants" },
      { property: "og:description", content: "Watch, review the photo movements and download your reel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(reelQuery(params.key)),
  component: ReelPage,
  errorComponent: ({ error }) => <main className="mx-auto max-w-[880px] px-6 py-10" role="alert"><p className="text-[15px]">{error instanceof Error ? error.message : "This reel couldn't load."}</p><BackLink /></main>,
  notFoundComponent: () => <main className="mx-auto max-w-[880px] px-6 py-10"><p>Reel not found.</p><BackLink /></main>,
});

function BackLink() {
  return (
    <Link to="/app/brand-home" className="mt-4 inline-flex items-center gap-1 text-[13px] text-ap-blue hover:underline">
      <ArrowLeft size={14} strokeWidth={1.7} /> Brand home
    </Link>
  );
}

function ReelPage() {
  const { key } = Route.useParams();
  const { data: reel } = useSuspenseQuery(reelQuery(key));
  if (!reel) return <main className="mx-auto max-w-[880px] px-6 py-10"><p className="text-[15px]">This reel isn't in your workspace.</p><BackLink /></main>;
  const custom = reel.frames.filter((f) => f.custom).length;
  return (
    <main className="mx-auto max-w-[880px] px-6 py-8">
      <BackLink />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">{reel.title}</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
        <div>
          {reel.videoUrl ? (
            <video src={reel.videoUrl} controls playsInline className="w-full rounded-sm bg-ap-panel" />
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center rounded-sm bg-ap-panel p-6 text-center text-[13px] text-secondary-text">No final video yet. Export it as an MP4 to watch and download it here.</div>
          )}
          {reel.downloadUrl && (
            <Button asChild className="mt-3 w-full" data-cta="client-reel-download">
              <a href={reel.downloadUrl} download={reel.fileName}><Download strokeWidth={1.7} /> Download video</a>
            </Button>
          )}
        </div>
        <section>
          <h2 className="text-[15px] font-semibold">Photo movements</h2>
          <p className="mt-1 text-[13px] text-secondary-text tabular-nums">
            {reel.frames.length === 0 ? "Movement details aren't available for this reel." : `${reel.frames.length} photo${reel.frames.length === 1 ? "" : "s"}, ${custom} with a custom movement.`}
          </p>
          <ol className="mt-3 space-y-2">
            {reel.frames.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 rounded-sm bg-card p-2 shadow-card">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-ap-panel">{f.photoUrl && <img src={f.photoUrl} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium tabular-nums">Photo {i + 1} · {f.seconds.toFixed(1)} sec</p>
                  <p className={`text-[13px] ${f.custom ? "text-ap-blue" : "text-secondary-text"}`}>{f.movement}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
