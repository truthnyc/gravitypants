import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

/** Brand join password: owners/admins (and staff) turn it on, share the link + password; joiners use a seat. */
export function JoinPasswordCard({ workspaceId, className }: { workspaceId: string; className?: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/app/join/${workspaceId}`;

  useEffect(() => {
    void supabase.rpc("join_password_info", { _ws: workspaceId }).then(({ data }) => setEnabled(Boolean((data as { enabled?: boolean } | null)?.enabled)));
  }, [workspaceId]);

  const save = async (value: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("set_join_password", { _ws: workspaceId, _password: value });
    setBusy(false);
    if (error) return toast.error(error.message.includes("8 to 100") ? "Use 8 to 100 characters." : "Couldn't save. Try again.");
    setEnabled(Boolean(data));
    setPw("");
    toast.success(data ? "Join password saved" : "Joining by password is off");
  };

  return (
    <section className={className}>
      <h2 className="text-[20px] font-semibold">Join with a password</h2>
      <p className="mt-1 text-[13px] text-secondary-text">
        People at your brand open the link, sign in and enter the password. Each person uses a seat. Only your brand's reels are visible to them.
      </p>
      {enabled && (
        <div className="mt-3 flex items-center gap-2">
          <Input readOnly aria-label="Join link" value={link} onFocus={(e) => e.currentTarget.select()} />
          <Button variant="plain" onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}>Copy link</Button>
        </div>
      )}
      <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void save(pw); }}>
        <Input type="password" autoComplete="new-password" aria-label={enabled ? "New join password" : "Join password"} placeholder={enabled ? "New password" : "At least 8 characters"} value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit" data-cta="join-password-save" disabled={busy || pw.length < 8}>{enabled ? "Change" : "Turn on"}</Button>
      </form>
      {enabled && (
        <button type="button" data-cta="join-password-off" className="mt-2 text-[13px] text-ap-blue hover:underline" disabled={busy} onClick={() => void save("")}>Turn off joining by password</button>
      )}
    </section>
  );
}
