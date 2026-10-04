import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdStatuses, hideReel } from "./directory.functions";
import { getWorkspaceId } from "@/lib/stillframe/workspace";

/** Directory status for every ad in the workspace, plus a hide action that logs the withdrawal. */
export function useDirectoryStatuses() {
  const ws = getWorkspaceId();
  const load = useServerFn(getAdStatuses);
  const hide = useServerFn(hideReel);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["directory-statuses", ws], queryFn: () => load({ data: { workspaceId: ws } }), staleTime: 30_000 });
  return {
    statuses: q.data?.statuses ?? {},
    liveUntil: q.data?.liveUntil ?? null,
    hide: async (adId: string) => {
      try {
        await hide({ data: { adId } });
        toast("Hidden from the Directory. Withdrawal saved to your log.");
        void qc.invalidateQueries({ queryKey: ["directory-statuses", ws] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't hide it. Try again.");
      }
    },
  };
}
