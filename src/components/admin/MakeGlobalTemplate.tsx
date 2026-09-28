import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin } from "@/lib/stillframe/admin.functions";
import { adminTemplateFromAd } from "@/lib/stillframe/admin-templates.functions";

/** Staff-only "Make global template": the server re-checks the admin role, this only decides whether to show it. */
export function useMakeGlobalTemplate() {
  const check = useServerFn(checkAdmin);
  const make = useServerFn(adminTemplateFromAd);
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["is-admin", "global-template"],
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return { admin: false };
      return check().catch(() => ({ admin: false }));
    },
    staleTime: 5 * 60_000,
  });
  const run = async (projectId: string) => {
    const t = toast.loading("Making a template draft…");
    try {
      const { id } = await make({ data: { projectId } });
      toast.success("Template draft created. Nothing is published yet.", { id: t });
      void navigate({ to: "/admin/templates/$id/edit", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work", { id: t });
    }
  };
  return { isAdmin: !!data?.admin, run };
}
