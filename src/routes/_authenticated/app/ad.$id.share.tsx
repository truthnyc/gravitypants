import { createFileRoute, Link } from "@tanstack/react-router";
import { AppButton } from "@/components/app-ui";
import { ShareStep } from "@/components/directory/ShareStep";
import { useProject } from "@/lib/stillframe/data";

export const Route = createFileRoute("/_authenticated/app/ad/$id/share")({
  head: () => ({
    meta: [
      { title: "Share to the Directory — Gravity Pants" },
      { name: "description", content: "Add your reel to the Gravity Pants Directory and your brand page." },
      { property: "og:title", content: "Share to the Directory — Gravity Pants" },
      { property: "og:description", content: "Add your reel to the Gravity Pants Directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShareRoute,
});

function ShareRoute() {
  const { id } = Route.useParams();
  const { data, isLoading } = useProject(id);
  if (isLoading) return <div className="ap-flow min-h-dvh" aria-busy="true" />;
  if (!data || !data.frames.length) {
    return (
      <main className="ap-flow flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-[400px] rounded-[24px] bg-ap-card p-10 text-center">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">This ad isn't available</h1>
          <p className="mt-2 text-[14px] text-ap-muted">It may have been moved to the trash.</p>
          <AppButton asChild variant="ghost" className="mt-6"><Link to="/app/ads">Back to Your Ads</Link></AppButton>
        </div>
      </main>
    );
  }
  const { frames, ...project } = data;
  return <ShareStep key={id} initial={{ project, frames }} />;
}
