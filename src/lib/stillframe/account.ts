import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { clearMediaCache } from "./media";
import { setWorkspaceId } from "./workspace";

export type Me = { id: string; email: string; displayName: string | null; avatarPath: string | null };

export const meKey = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<Me | null> => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle();
      return { id: user.id, email: user.email ?? "", displayName: p?.display_name ?? null, avatarPath: p?.avatar_url ?? null };
    },
  });
}

export function initialsOf(me: Me | null | undefined) {
  const src = (me?.displayName || me?.email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (me?.displayName ? parts[1]?.[0] ?? "" : "")).toUpperCase();
}

export async function signOutEverywhere(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  clearMediaCache();
  setWorkspaceId(null);
  await supabase.auth.signOut();
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await signOutEverywhere(qc);
    navigate({ to: "/signin", replace: true });
  };
}
