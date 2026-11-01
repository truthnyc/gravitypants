import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { rememberWorkspaceId } from "@/lib/stillframe/workspace";

export const Route = createFileRoute("/_authenticated/app/join/$ws")({
  head: () => ({
    meta: [
      { title: "Join your brand — Gravity Pants" },
      { name: "description", content: "Enter your brand's password to see and share its reels." },
      { property: "og:title", content: "Join your brand — Gravity Pants" },
      { property: "og:description", content: "Enter your brand's password to join." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { ws } = Route.useParams();
  const [info, setInfo] = useState<{ name: string; member: boolean } | null | undefined>(undefined);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(ws)) return setInfo(null);
    void supabase.rpc("join_password_info", { _ws: ws }).then(({ data }) => setInfo((data as { name: string; member: boolean } | null) ?? null));
  }, [ws]);

  const enter = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) rememberWorkspaceId(u.user.id, ws);
    window.location.href = "/app/brand-home";
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("join_with_password", { _ws: ws, _password: pw });
    setBusy(false);
    if (e) {
      const m = e.message;
      setError(/Too many|no free seats|another team|is off/.test(m) ? `${m}.` : "Couldn't join. Try again.");
      return;
    }
    if (!data) return setError("That password isn't right.");
    await enter();
  };

  return (
    <main className="mx-auto max-w-[420px] px-4 pb-16 pt-12">
      {info === undefined ? (
        <p className="text-[13px] text-secondary-text">Loading…</p>
      ) : info === null ? (
        <section className="rounded-sm bg-card p-6 shadow-card">
          <h1 className="text-[20px] font-semibold">This link isn't active</h1>
          <p className="mt-1 text-[13px] text-secondary-text">Ask your brand's owner for a new link or an email invite.</p>
          <Button asChild className="mt-4"><Link to="/app/ads">Go to Your Ads</Link></Button>
        </section>
      ) : info.member ? (
        <section className="rounded-sm bg-card p-6 shadow-card">
          <h1 className="text-[20px] font-semibold">You're already in {info.name}</h1>
          <Button className="mt-4" onClick={() => void enter()}>Open Brand home</Button>
        </section>
      ) : (
        <form className="rounded-sm bg-card p-6 shadow-card" onSubmit={(e) => { e.preventDefault(); void join(); }}>
          <h1 className="text-[20px] font-semibold">Join {info.name}</h1>
          <p className="mt-1 text-[13px] text-secondary-text">Enter the password your brand gave you.</p>
          <Input className="mt-4" type="password" autoComplete="current-password" aria-label="Brand password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {error && <p role="alert" className="mt-2 text-[13px] text-destructive">{error}</p>}
          <Button type="submit" data-cta="join-brand" className="mt-4 w-full" disabled={busy || !pw}>{busy ? "Joining" : "Join"}</Button>
        </form>
      )}
    </main>
  );
}
