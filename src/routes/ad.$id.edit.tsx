import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ad/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit ad — Stillframe" },
      { name: "description", content: "Edit photos, text, timing and transitions for your ad." },
      { property: "og:title", content: "Edit ad — Stillframe" },
      { property: "og:description", content: "Edit photos, text, timing and transitions." },
    ],
  }),
  component: EditPlaceholder,
});

function EditPlaceholder() {
  const { id } = Route.useParams();
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-8">
      <div className="max-w-[420px] rounded-sm bg-card p-10 text-center shadow-card">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Editor coming next</h1>
        <p className="mt-2 text-[14px] text-secondary-text">
          This ad is saved and ready. Frames, text, timing and transitions land here next.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="plain">
            <Link to="/">Back to Your Ads</Link>
          </Button>
          <Button asChild>
            <Link to="/ad/$id/export" params={{ id }}>
              Export
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
