import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Copy } from "lucide-react";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { AppButton } from "@/components/app-ui";
import { Switch } from "@/components/ui/switch";
import { DirectoryGrid, ReelDetail } from "@/components/directory/DirectoryGrid";
import { getMyFavorites, saveFavoritePage } from "@/lib/directory/favorites.functions";
import type { DirectoryCard } from "@/lib/directory/directory";

export const Route = createFileRoute("/_authenticated/app/account_/favorites")({
  head: () => ({ meta: [{ title: "My favorites — Gravity Pants" }, { name: "robots", content: "noindex" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const load = useServerFn(getMyFavorites);
  const save = useServerFn(saveFavoritePage);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-favorites"], queryFn: () => load() });
  const d = q.data;
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [pub, setPub] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<DirectoryCard | null>(null);

  useEffect(() => {
    if (!d) return;
    setSlug(d.page?.slug ?? "");
    setTitle(d.page?.title ?? "");
    setPub(d.page?.is_public ?? false);
  }, [d]);

  const valid = /^[a-z0-9-]{3,30}$/.test(slug);
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/favorites/${d?.page?.slug ?? slug}`;

  const submit = async (nextPub = pub) => {
    if (!valid) { toast.error("Use 3 to 30 letters, numbers or hyphens for the address."); return; }
    setBusy(true);
    try {
      await save({ data: { slug, title: title || null, is_public: nextPub } });
      setPub(nextPub);
      toast.success(nextPub ? "Your favorites page is shared" : "Saved");
      void qc.invalidateQueries({ queryKey: ["my-favorites"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Account</h1>
      <div className="max-w-[640px]"><AccountTabs /></div>
      <section className="rounded-[24px] bg-ap-card p-[26px] font-ap text-ap-ink">
        <h2 className="text-[20px] font-semibold">Share my favorites</h2>
        <p className="mt-1 text-[14px] text-ap-body">Your favorites are private until you turn on sharing. Anyone with the link can then see the reels and brands you saved.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-ap-muted">Page title
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="My favorites" className="mt-1 h-10 w-full rounded-[4px] border border-ap-hairline px-3 text-[14px] text-ap-ink" />
          </label>
          <label className="text-[13px] text-ap-muted">Page address
            <div className="mt-1 flex h-10 items-center rounded-[4px] border border-ap-hairline px-3 text-[14px] text-ap-ink">
              <span className="text-ap-muted">/favorites/</span>
              <input value={slug} maxLength={30} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="your-name" className="min-w-0 flex-1 bg-transparent outline-none" />
            </div>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[14px]">
            <Switch checked={pub} disabled={busy || !valid} onCheckedChange={(v) => void submit(v)} /> Share publicly
          </label>
          <AppButton size="sm" disabled={busy || !valid} onClick={() => void submit()}>Save</AppButton>
          {d?.page?.is_public && (
            <>
              <AppButton size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("Link copied"); }}><Copy className="size-4" strokeWidth={1.7} /> Copy link</AppButton>
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] text-ap-blue">View page <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>
            </>
          )}
        </div>
      </section>

      <section className="rounded-[24px] bg-ap-card p-[26px] font-ap text-ap-ink">
        <h2 className="mb-4 text-[20px] font-semibold">Saved reels</h2>
        {q.isLoading ? <div className="h-24" aria-busy="true" />
          : d?.reels.length ? <DirectoryGrid cards={d.reels} onOpen={setOpen} />
          : <p className="text-[14px] text-ap-body">Tap the heart on any reel in the <Link to="/directory" className="text-ap-blue">Directory</Link> to save it here.</p>}
      </section>
      <section className="rounded-[24px] bg-ap-card p-[26px] font-ap text-ap-ink">
        <h2 className="mb-4 text-[20px] font-semibold">Saved brands</h2>
        {d?.brands.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.brands.map((b) => (
              <li key={b.id}><Link to="/directory/$slug" params={{ slug: b.slug }} className="block rounded-[4px] bg-ap-panel p-3 hover:text-ap-blue">
                <span className="flex size-9 items-center justify-center rounded-[4px] bg-ap-hairline">
                  {b.logo
                    ? <img src={b.logo} alt="" className="max-h-full max-w-full object-contain" />
                    : <span className="text-[16px] font-semibold text-ap-muted">{b.name.charAt(0).toUpperCase()}</span>}
                </span>
                <p className="mt-2.5 text-[12px] text-ap-muted">{b.category}</p>
                <p className="mt-0.5 truncate text-[14px] font-semibold">{b.name}</p>
              </Link></li>
            ))}
          </ul>
        ) : <p className="text-[14px] text-ap-body">No saved brands yet.</p>}
      </section>
      <ReelDetail card={open} onClose={() => setOpen(null)} />
    </main>
  );
}
