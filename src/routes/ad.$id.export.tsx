import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ExportPage } from "@/components/export/ExportPage";
import { useProject } from "@/lib/stillframe/data";

export const Route = createFileRoute("/ad/$id/export")({
  head: () => ({
    meta: [
      { title: "Export ad — Stillframe" },
      { name: "description", content: "Save your ad as MP4 videos and animated GIFs for every social channel." },
      { property: "og:title", content: "Export ad — Stillframe" },
      { property: "og:description", content: "Save your ad as MP4 videos and animated GIFs for every channel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExportRoute,
});

function ExportRoute() {
  const { id } = Route.useParams();
  const { data, isLoading } = useProject(id);
  if (isLoading) return <div className="h-screen bg-canvas" aria-busy="true" />;
  if (!data || !data.frames.length) {
    return (
      <main className="flex h-screen items-center justify-center px-8">
        <div className="max-w-[400px] rounded-sm bg-card p-10 text-center shadow-card">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">This ad isn't available</h1>
          <p className="mt-2 text-[14px] text-secondary-text">It may have been moved to the trash.</p>
          <Button asChild variant="plain" className="mt-6">
            <Link to="/">Back to Your Ads</Link>
          </Button>
        </div>
      </main>
    );
  }
  const { frames, ...project } = data;
  return <ExportPage key={id} project={project} frames={frames} />;
}
