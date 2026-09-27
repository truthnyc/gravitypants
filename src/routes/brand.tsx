import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand Kit — Stillframe" },
      {
        name: "description",
        content: "Keep your logos, colors and fonts in one place so every ad matches your brand.",
      },
      { property: "og:title", content: "Brand Kit — Stillframe" },
      {
        property: "og:description",
        content: "Logos, colors and fonts that every Stillframe ad reuses.",
      },
    ],
  }),
  component: BrandPlaceholder,
});

function BrandPlaceholder() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-8">
      <div className="max-w-[420px] rounded-sm bg-card p-10 text-center shadow-card">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Brand Kit coming soon</h1>
        <p className="mt-2 text-[14px] text-secondary-text">
          Your logos, colors, fonts and end card will live here.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="plain">
            <Link to="/">Back to Your Ads</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
