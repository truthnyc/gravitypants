import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Editor } from "@/components/editor/Editor";
import { useProject } from "@/lib/stillframe/data";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminLogOpen } from "@/lib/stillframe/admin.functions";
import { getWorkspaceId } from "@/lib/stillframe/workspace";

export const Route = createFileRoute("/_authenticated/ad/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit ad — Stillframe" },
      { name: "description", content: "Edit photos, text, timing and transitions for your ad." },
      { property: "og:title", content: "Edit ad — Stillframe" },
      { property: "og:description", content: "Edit photos, text, timing and transitions." },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useProject(id);
  const foreign = !!data && data.workspace_id !== getWorkspaceId();
  const logOpen = useServerFn(adminLogOpen);
  const { data: admin, isLoading: adminLoading } = useQuery({
    queryKey: ["admin", "open", id],
    enabled: foreign,
    queryFn: () => logOpen({ data: { projectId: id } }),
    staleTime: Infinity,
  });

  if (isLoading || (foreign && adminLoading)) return <div className="h-screen bg-canvas" aria-busy="true" />;
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
  if (foreign) {
    const support = !!admin?.supportUntil && new Date(admin.supportUntil) > new Date();
    return (
      <Editor
        key={`${id}-${support}`}
        initial={{ project, frames }}
        readOnly={!support}
        exportDisabled={!support}
        banner={
          <div role="status" className="flex h-8 shrink-0 items-center justify-center gap-3 bg-foreground text-[13px] text-background">
            {support ? "Support editing — every change is logged" : "Viewing as admin — read only"}
            <Link to="/admin/clients/$id" params={{ id: project.workspace_id }} className="underline">Back to client</Link>
          </div>
        }
      />
    );
  }
  return <Editor key={id} initial={{ project, frames }} />;
}
