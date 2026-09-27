import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/stillframe/UserMenu";
import { meKey, signOutEverywhere, useMe } from "@/lib/stillframe/account";
import { deleteMyAccount } from "@/lib/stillframe/account.functions";
import { uploadMedia } from "@/lib/stillframe/media";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Stillframe" },
      { name: "description", content: "Your Stillframe profile, email, password and account settings." },
      { property: "og:title", content: "Account — Stillframe" },
      { property: "og:description", content: "Your profile, email and password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-sm bg-card p-6 shadow-card">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-secondary-text">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const inputCls =
  "h-10 w-full rounded-sm bg-card px-3 text-[14px] outline outline-[0.5px] outline-border focus-visible:outline-2 focus-visible:outline-primary";

function AccountPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const del = useServerFn(deleteMyAccount);

  useEffect(() => {
    if (me) {
      setName(me.displayName ?? "");
      setEmail(me.email);
    }
  }, [me]);

  async function saveProfile(patch: { display_name?: string | null; avatar_url?: string | null }) {
    if (!me) return;
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", me.id);
    if (error) toast.error("Couldn't save your profile.");
    else {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: meKey });
    }
  }

  async function onAvatar(file: File) {
    try {
      const up = await uploadMedia(file, "photo");
      await saveProfile({ avatar_url: up.path });
    } catch {
      toast.error("Couldn't upload that photo.");
    }
  }

  async function changeEmail() {
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: window.location.origin + "/account" });
    if (error) toast.error("Couldn't change your email. Please check it and try again.");
    else toast.success("Check both inboxes to confirm the new email.");
  }

  async function changePassword() {
    if (pw.length < 6) return toast.error("Please use a password with at least 6 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as never);
    if (error) toast.error(error.message.toLowerCase().includes("current") ? "Your current password isn't right." : "Couldn't change your password.");
    else {
      toast.success("Password changed");
      setPw("");
      setCurrent("");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await del();
      await signOutEverywhere(qc);
      window.location.replace("/signin");
    } catch {
      setDeleting(false);
      toast.error("Couldn't delete your account. Please try again.");
    }
  }

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-8 py-10">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Account</h1>

      <Card title="Profile">
        <div className="flex items-center gap-4">
          <Avatar me={me} size={56} />
          <Button variant="plain" size="sm" onClick={() => fileRef.current?.click()}>Change Photo</Button>
          {me?.avatarPath && (
            <Button variant="plain" size="sm" onClick={() => void saveProfile({ avatar_url: null })}>Remove</Button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void onAvatar(e.target.files[0])} />
        </div>
        <label htmlFor="display-name" className="mt-5 block text-[13px] font-medium">Name</label>
        <div className="mt-1.5 flex gap-2">
          <input id="display-name" className={inputCls} value={name} placeholder="Optional" onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Button onClick={() => void saveProfile({ display_name: name.trim() || null })}>Save</Button>
        </div>
      </Card>

      <Card title="Email" hint="We'll send a link to confirm the change.">
        <div className="flex gap-2">
          <label htmlFor="acc-email" className="sr-only">Email</label>
          <input id="acc-email" type="email" autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button disabled={!email || email === me?.email} onClick={() => void changeEmail()}>Change</Button>
        </div>
      </Card>

      <Card title="Password">
        <div className="flex flex-col gap-2">
          <label htmlFor="cur-pw" className="sr-only">Current password</label>
          <input id="cur-pw" type="password" autoComplete="current-password" placeholder="Current password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} />
          <label htmlFor="new-pw" className="sr-only">New password</label>
          <input id="new-pw" type="password" autoComplete="new-password" placeholder="New password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button className="self-start" disabled={!pw} onClick={() => void changePassword()}>Change Password</Button>
        </div>
      </Card>

      <Card title="Delete account" hint="Removes your ads, photos, Brand Kit and exported files for good.">
        <Button variant="destructive-plain" onClick={() => { setTyped(""); setConfirmOpen(true); }}>Delete Account…</Button>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>This can't be undone. Type DELETE to confirm.</DialogDescription>
          </DialogHeader>
          <label htmlFor="type-delete" className="sr-only">Type DELETE</label>
          <input id="type-delete" className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <DialogFooter>
            <Button variant="plain" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={typed !== "DELETE" || deleting} onClick={() => void deleteAccount()}>
              {deleting ? "Deleting…" : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
