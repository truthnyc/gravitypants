import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { inviteMember, resendInvite } from "@/lib/stillframe/team.functions";
import { useBilling } from "@/lib/stillframe/billing";
import { getWorkspaceId, rememberWorkspaceId } from "@/lib/stillframe/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/account_/members")({
  head: () => ({
    meta: [
      { title: "Team — Gravity Pants" },
      { name: "description", content: "Manage your Gravity Pants team: members, roles and invites." },
      { property: "og:title", content: "Team — Gravity Pants" },
      { property: "og:description", content: "Manage members, roles and invites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MembersPage,
});

const inputCls =
  "h-10 w-full rounded-sm bg-card px-3 text-[16px] sm:text-[14px] outline outline-[0.5px] outline-border focus-visible:outline-2 focus-visible:outline-primary";

type Member = { user_id: string; role: string; email: string; display_name: string | null };
type Invite = { id: string; email: string; role: string; expires_at: string };

function useWorkspaces() {
  return useQuery({
    queryKey: ["my-workspaces"],
    queryFn: async () => {
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

function useMembers(ws: string) {
  return useQuery({
    queryKey: ["members", ws],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("workspace_member_list" as never, { _ws: ws } as never);
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    },
  });
}

function useInvites(ws: string) {
  return useQuery({
    queryKey: ["invites", ws],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("id, email, role, expires_at")
        .eq("workspace_id", ws)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
  });
}

function MembersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: workspaces } = useWorkspaces();
  const ws = getWorkspaceId();
  const current = workspaces?.find((w) => w.id === ws);
  const isAdmin = current?.role === "owner" || current?.role === "admin";
  const { data: members } = useMembers(ws);
  const { data: invites } = useInvites(ws);
  const { data: billing } = useBilling();
  const isTeamPlan = billing?.plan === "team" || billing?.plan === "team_yearly";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const invite = useServerFn(inviteMember);
  const resend = useServerFn(resendInvite);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["members", ws] });
    void qc.invalidateQueries({ queryKey: ["invites", ws] });
    void qc.invalidateQueries({ queryKey: ["my-workspaces"] });
  };

  async function switchWorkspace(id: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || !workspaces?.some((w) => w.id === id)) return;
    rememberWorkspaceId(auth.user.id, id);
    window.location.href = "/app/ads";
  }

  async function sendInvite() {
    setBusy(true);
    const r = await invite({ data: { workspaceId: ws, email: email.trim(), role } });
    setBusy(false);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success("Invite sent");
      setEmail("");
      refresh();
    }
  }

  async function changeRole(m: Member, next: string) {
    const { error } = await supabase.from("workspace_members").update({ role: next }).eq("workspace_id", ws).eq("user_id", m.user_id);
    if (error) toast.error("Couldn't change that role. Only owners and admins can.");
    else refresh();
  }

  async function removeMember(m: Member) {
    const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", ws).eq("user_id", m.user_id);
    if (error) toast.error("Couldn't remove that person.");
    else {
      toast.success(`${m.display_name || m.email} was removed`);
      refresh();
    }
  }

  async function cancelInvite(id: string) {
    const { error } = await supabase.from("workspace_invites").delete().eq("id", id);
    if (error) toast.error("Couldn't cancel that invite.");
    else refresh();
  }

  async function createTeamWorkspace() {
    if (!isTeamPlan) return;
    setCreating(true);
    const name = window.prompt("Name your team workspace", "My team");
    if (!name?.trim()) {
      setCreating(false);
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id;
    if (!uid) {
      setCreating(false);
      toast.error("Please sign in again to create a workspace.");
      return;
    }
    const { data: wsRow, error } = await supabase.from("workspaces").insert({ name: name.trim(), owner_id: uid }).select("id").single();
    if (error || !wsRow) {
      setCreating(false);
      toast.error("Couldn't create the workspace. Please try again.");
      return;
    }
    const { error: memErr } = await supabase.from("workspace_members").insert({ workspace_id: wsRow.id, user_id: uid, role: "owner" });
    if (memErr) {
      setCreating(false);
      toast.error("Couldn't create the workspace. Please try again.");
      return;
    }
    await supabase.from("brand_kit").insert({ workspace_id: wsRow.id });
    toast.success("Team workspace created");
    rememberWorkspaceId(uid, wsRow.id);
    window.location.href = "/app/account/members";
  }

  const seats = billing?.plan === "team" || billing?.plan === "team_yearly" ? 4 : 1;

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Account</h1>
      <AccountTabs />

      <section className="rounded-sm bg-card p-6 shadow-card">
        <h2 className="text-[17px] font-semibold">Workspace</h2>
        <p className="mt-0.5 text-[13px] text-secondary-text">
          {isTeamPlan ? `Your Team plan lets you invite ${seats - 1} teammates with shared ads, brand kits and templates.` : "Team workspaces with shared ads and brand kits are part of the Team plan."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {(workspaces ?? []).map((w) => (
            <button
              key={w.id}
              onClick={() => w.id !== ws && void switchWorkspace(w.id)}
              className={cn(
                "flex h-11 items-center justify-between rounded-sm px-3 text-left text-[14px] outline outline-[0.5px] outline-border",
                w.id === ws ? "bg-control-fill font-medium" : "bg-card hover:bg-control-fill/60",
              )}
            >
              <span>{w.name}</span>
              <span className="text-[12px] text-secondary-text">{w.id === ws ? "Current" : w.role}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          {isTeamPlan ? (
            <Button variant="plain" onClick={() => void createTeamWorkspace()} disabled={creating}>
              {creating ? "Creating…" : "Create Team Workspace"}
            </Button>
          ) : (
            <p className="text-[13px] text-secondary-text">
              Want a team workspace? <Link to="/pricing" className="font-medium text-primary">See the Team plan</Link>.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-sm bg-card p-6 shadow-card">
        <h2 className="text-[17px] font-semibold">Members</h2>
        <p className="mt-0.5 text-[13px] text-secondary-text">
          {members?.length ?? 0} of {seats} {seats === 1 ? "seat" : "seats"} used
        </p>
        <div className="mt-4 flex flex-col divide-y divide-border/60">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{m.display_name || m.email}</p>
                {m.display_name && <p className="truncate text-[12px] text-secondary-text">{m.email}</p>}
              </div>
              {isAdmin && m.role !== "owner" ? (
                <>
                  <select
                    aria-label={`Role for ${m.email}`}
                    className="h-9 rounded-sm bg-card px-2 text-[13px] outline outline-[0.5px] outline-border"
                    value={m.role}
                    onChange={(e) => void changeRole(m, e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                  </select>
                  <Button variant="plain" size="sm" onClick={() => void removeMember(m)}>Remove</Button>
                </>
              ) : (
                <span className="text-[13px] capitalize text-secondary-text">{m.role}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-sm bg-card p-6 shadow-card">
          <h2 className="text-[17px] font-semibold">Invite by email</h2>
          <p className="mt-0.5 text-[13px] text-secondary-text">They'll get an email with a link to join after they sign in.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="invite-email" className="sr-only">Email</label>
            <input
              id="invite-email"
              type="email"
              className={inputCls}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              aria-label="Role"
              className="h-10 rounded-sm bg-card px-2 text-[14px] outline outline-[0.5px] outline-border"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "editor")}
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <Button disabled={!email.trim() || busy} onClick={() => void sendInvite()}>
              {busy ? "Sending…" : "Send Invite"}
            </Button>
          </div>

          {(invites ?? []).length > 0 && (
            <div className="mt-5">
              <h3 className="text-[13px] font-semibold text-secondary-text">Pending invites</h3>
              <div className="mt-2 flex flex-col divide-y divide-border/60">
                {(invites ?? []).map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[14px]">{i.email}</span>
                    <span className="text-[12px] capitalize text-secondary-text">{i.role}</span>
                    <Button variant="plain" size="sm" onClick={() => void resend({ data: { inviteId: i.id } }).then((r) => ("error" in r ? toast.error(r.error) : toast.success("Invite resent")))}>
                      Resend
                    </Button>
                    <Button variant="plain" size="sm" onClick={() => void cancelInvite(i.id)}>Cancel</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
