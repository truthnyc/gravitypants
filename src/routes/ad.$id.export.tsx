import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ad/$id/export")({
  head: () => ({
    meta: [
      { title: "Export ad — Stillframe" },
      { name: "description", content: "Export your ad as an MP4 video or an animated GIF." },
      { property: "og:title", content: "Export ad — Stillframe" },
      { property: "og:description", content: "Export your ad as MP4 video or animated GIF." },
    ],
  }),
  component: ExportPlaceholder,
});

function ExportPlaceholder() {
  const { id } = Route.useParams();
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-8">
      <div className="max-w-[420px] rounded-sm bg-card p-10 text-center shadow-card">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Export coming soon</h1>
        <p className="mt-2 text-[14px] text-secondary-text">
          MP4 video and animated GIF exports for every format will appear here.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="plain">
            <Link to="/ad/$id/edit" params={{ id }}>
              Back to editor
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
