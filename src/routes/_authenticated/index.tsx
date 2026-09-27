import { createFileRoute } from "@tanstack/react-router";
import { AdCard } from "@/components/stillframe/AdCard";
import { DropZone } from "@/components/stillframe/DropZone";
import { useSearch } from "@/components/stillframe/search-context";
import { useProjects } from "@/lib/stillframe/data";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Your Ads — Stillframe" },
      {
        name: "description",
        content:
          "Turn still photos into short video ads and animated GIFs for social channels. Drop photos, get an ad.",
      },
      { property: "og:title", content: "Your Ads — Stillframe" },
      {
        property: "og:description",
        content: "Turn still photos into short video ads and animated GIFs for social channels.",
      },
    ],
  }),
  component: YourAds,
});

function YourAds() {
  const { query } = useSearch();
  const { data: projects, isLoading } = useProjects();

  const term = query.trim().toLowerCase();
  const visible = (projects ?? []).filter((project) =>
    term ? project.name.toLowerCase().includes(term) : true,
  );
  const isEmpty = !isLoading && (projects ?? []).length === 0;

  return (
    <main className="px-8 py-10 lg:px-16">
      <div className={isEmpty ? "mx-auto max-w-[860px] py-16" : ""}>
        <DropZone spacious={isEmpty} />
      </div>

      {!isEmpty && (
        <section className="mt-12">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">Your ads</h2>

          {isLoading ? (
            <div className="mt-5 grid grid-cols-3 gap-6 xl:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-[252px] animate-pulse rounded-sm bg-card shadow-card" />
              ))}
            </div>
          ) : visible.length ? (
            <div className="mt-5 grid grid-cols-3 gap-6 xl:grid-cols-4">
              {visible.map((project) => (
                <AdCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[14px] text-secondary-text">
              No ads match “{query.trim()}”.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
