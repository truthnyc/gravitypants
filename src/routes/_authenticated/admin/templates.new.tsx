import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminTemplateCreate } from "@/lib/stillframe/admin-templates.functions";
import { adminTemplatesKey } from "@/components/admin/TemplateAdminBits";

export const Route = createFileRoute("/_authenticated/admin/templates/new")({
  head: () => ({ meta: [
    { title: "New template — Gravity Pants Admin" },
    { name: "description", content: "Start a new ready-made Gravity Pants template." },
    { property: "og:title", content: "New template — Gravity Pants Admin" },
    { property: "og:description", content: "Start a new ready-made Gravity Pants template." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: NewTemplate,
});

/** Creates a private draft, then opens it in the builder. */
function NewTemplate() {
  const create = useServerFn(adminTemplateCreate);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create()
      .then(async ({ id }) => {
        await qc.invalidateQueries({ queryKey: adminTemplatesKey });
        void navigate({ to: "/admin/templates/$id/edit", params: { id }, replace: true });
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "That didn't work");
        void navigate({ to: "/admin/templates", replace: true });
      });
  }, [create, navigate, qc]);
  return <p className="text-[13px] text-secondary-text">Creating a draft…</p>;
}
