import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, fmtDateTime, PageTitle } from "@/components/admin/AdminShell";
import { adminAdmins, adminSetAdmin } from "@/lib/stillframe/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/admins")({ component: Admins });

function Admins() {
  const fn = useServerFn(adminAdmins);
  const set = useServerFn(adminSetAdmin);
  const { data, refetch } = useQuery({ queryKey: ["admin", "admins"], queryFn: () => fn() });
  const [email, setEmail] = useState("");
  const change = async (d: { email?: string; userId?: string; grant: boolean }) => {
    try {
      await set({ data: d });
      toast(d.grant ? "Admin added" : "Admin removed");
      setEmail("");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    }
  };
  return (
    <>
      <PageTitle title="Admins" sub="People who can see every client. They need an account first." />
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void change({ email, grant: true }); }}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="h-9 w-[280px] bg-card" aria-label="Email" />
        <Button type="submit" size="header" disabled={!email}>Add Admin</Button>
      </form>
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {(data ?? []).map((a) => (
            <li key={a.userId} className="flex items-center justify-between px-5 py-3 text-[14px]">
              <span>
                <span className="font-medium">{a.email}</span>
                {a.name && <span className="text-secondary-text"> · {a.name}</span>}
                <span className="block text-[13px] text-secondary-text nums">Last sign-in {fmtDateTime(a.lastSignIn)}</span>
              </span>
              <Button variant="plain" size="sm" disabled={(data?.length ?? 0) <= 1} onClick={() => void change({ userId: a.userId, grant: false })}>Remove</Button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
