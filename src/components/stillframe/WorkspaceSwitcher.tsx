import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { peekWorkspaceId, rememberWorkspaceId } from "@/lib/stillframe/workspace";
import { cn } from "@/lib/utils";

type Workspace = { id: string; role: string; name: string };

/** Workspaces the signed-in person belongs to (same cache key as Account › Team). */
export function useMyWorkspaces() {
  return useQuery({
    queryKey: ["my-workspaces"],
    staleTime: 60_000,
    queryFn: async (): Promise<Workspace[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, workspaces(name)")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.workspace_id as string,
        role: r.role as string,
        name: (r.workspaces as unknown as { name: string } | null)?.name ?? "Workspace",
      }));
    },
  });
}

const roleLabel = (role: string) =>
  role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Editor";

export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { data: workspaces } = useMyWorkspaces();
  const active = peekWorkspaceId();
  const current = workspaces?.find((w) => w.id === active);

  // Nothing to switch between: keep the header clean.
  if (!workspaces || workspaces.length < 2 || !current) return null;

  async function switchTo(id: string) {
    if (id === active) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || !workspaces?.some((w) => w.id === id)) return;
    rememberWorkspaceId(auth.user.id, id);
    window.location.href = "/app/ads";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch workspace"
        className={cn(
          "flex h-8 min-w-0 max-w-[190px] items-center gap-1 rounded-lg px-2 text-[14px] font-medium text-foreground",
          "transition-colors hover:bg-control-fill/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span className="truncate">{current.name}</span>
        <ChevronDown size={15} strokeWidth={1.7} className="shrink-0 text-icon" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[12px] font-normal text-secondary-text">Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onSelect={() => void switchTo(w.id)} className="gap-2">
            <span className="min-w-0 flex-1 truncate">{w.name}</span>
            <span className="text-[12px] text-secondary-text">{roleLabel(w.role)}</span>
            {w.id === active && <Check size={15} strokeWidth={1.7} className="shrink-0 text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
