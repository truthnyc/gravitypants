import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Copy, Heart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { AppButton } from "@/components/app-ui";
import { Switch } from "@/components/ui/switch";
import { ReelDetail } from "@/components/directory/DirectoryGrid";
import { getMyFavorites, saveFavoritePage } from "@/lib/directory/favorites.functions";
import { ratio, type DirectoryCard } from "@/lib/directory/directory";

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

  const removeReel = async (id: string) => {
    const { error } = await (supabase as any).from("directory_reel_favorites").delete().eq("reel_id", id);
    if (error) toast.error("Couldn't remove it. Try again."); else void qc.invalidateQueries({ queryKey: ["my-favorites"] });
  };
  const removeBrand = async (id: string) => {
    const { error } = await (supabase as any).from("directory_favorites").delete().eq("brand_id", id);
    if (error) toast.error("Couldn't remove it. Try again."); else void qc.invalidateQueries({ queryKey: ["my-favorites"] });
  };
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
    <main className="acct mx-auto flex w-full max-w-[780px] flex-col gap-4 px-4 pb-20 pt-9 sm:px-6">
      <h1 className="acct-h1">Account</h1>
      <AccountTabs />
      <section className="acct-card">
        <h2 className="text-[20px] font-semibold">Share my favorites</h2>
        <p className="mt-1 text-[14px] text-ap-body">Your favorites are private until you turn on sharing. Anyone with the link can then see the reels and brands you saved.</p>
        <div className="mt-[18px] grid gap-3.5 sm:grid-cols-2">
          <label className="block"><span className="mb-[7px] flex justify-between text-[13px] font-semibold">Page title <em className={cn("not-italic font-normal text-[12px] nums", title.length >= 45 ? "text-ap-amber" : "text-ap-muted")}>{title.length} / 50</em></span>
            <input value={title} maxLength={50} onChange={(e) => setTitle(e.target.value)} placeholder="My favorites" className="w-full text-[14px]" />
          </label>
          <label className="block"><span className="mb-[7px] flex justify-between text-[13px] font-semibold">Page address <em className="not-italic font-normal text-[12px] nums text-ap-muted">{slug.length} / 30</em></span>
            <div className="flex h-11 items-center rounded-[12px] border border-ap-hairline px-3.5 text-[14px] focus-within:border-ap-blue">
              <span className="whitespace-nowrap text-ap-muted">gravitypants.com/favorites/</span>
              <input value={slug} maxLength={30} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="your-name" className="acct-bare min-w-0 flex-1 bg-transparent outline-none" />
            </div>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="mr-auto flex items-center gap-2.5 text-[14px] text-ap-body">
            <Switch checked={pub} disabled={busy || !valid} onCheckedChange={(v) => void submit(v)} />
            {pub ? "Shared: anyone with the link can view" : "Private: only you can see it"}
          </label>
          {d?.page?.is_public && (
            <>
              <AppButton size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("Link copied"); }}><Copy className="size-4" strokeWidth={1.7} /> Copy link</AppButton>
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] text-ap-blue">View page <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>
            </>
          )}
          <AppButton size="sm" disabled={busy || !valid} onClick={() => void submit()}>Save</AppButton>
        </div>
      </section>

      <section className="acct-card">
        <h2 className="text-[20px] font-semibold">Saved reels</h2>
        <p className="mt-1 mb-4 text-[14px] text-ap-body">Tap the heart in the Directory to save a reel. Tap it again here to remove it.</p>
        {q.isLoading ? <div className="h-24" aria-busy="true" />
          : d?.reels.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-3.5 gap-y-[18px]">
              {d.reels.map((c) => (
                <div key={c.reel_id} className="relative">
                  <button type="button" onClick={() => setOpen(c)} aria-label={`Open ${c.title ?? "reel"}`} className="relative block aspect-square w-full overflow-hidden rounded-[8px] bg-ap-panel">
                    {c.poster && <img src={c.poster} alt="" loading="lazy" className="absolute top-1/2 left-1/2 max-h-[72%] max-w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[6px] shadow-[0_0_0_1px_var(--ap-inner),0_18px_34px_-16px_rgba(29,29,31,.28)]" />}
                    {c.formats[0] && <span className="absolute top-2 left-2 rounded-[6px] bg-ap-card/95 px-[7px] py-[3px] text-[12px] font-semibold nums">{ratio(c.formats[0])}</span>}
                  </button>
                  <button type="button" aria-label="Remove from favorites" onClick={() => void removeReel(c.reel_id)} className="absolute top-1.5 right-1.5 grid size-[30px] place-items-center rounded-[8px] bg-ap-card/95 text-destructive">
                    <Heart className="size-4 fill-current" strokeWidth={1.7} />
                  </button>
                  <p className="mt-2 truncate text-[14px] font-semibold">{c.title ?? c.template_name ?? "Custom reel"}</p>
                  <p className="text-[12px] text-ap-body nums">{c.seconds.toFixed(1)} sec · {c.brand_name}</p>
                  {c.tags.length > 0 && <p className="truncate text-[12px] text-ap-badge">{c.tags.slice(0, 3).join(" · ")}</p>}
                </div>
              ))}
            </div>
          )
          : <p className="text-[14px] text-ap-body">Tap the heart on any reel in the <Link to="/directory" className="text-ap-blue">Directory</Link> to save it here.</p>}
      </section>
      <section className="acct-card">
        <h2 className="text-[20px] font-semibold">Saved brands</h2>
        <p className="mt-1 mb-4 text-[14px] text-ap-body">Brands you saved from the Directory. Tap a brand to open its page.</p>
        {d?.brands.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.brands.map((b) => (
              <li key={b.id} className="relative"><button type="button" aria-label={`Remove ${b.name}`} onClick={() => void removeBrand(b.id)} className="absolute top-2 right-2 grid size-7 place-items-center rounded-[8px] text-ap-muted hover:bg-ap-panel"><X className="size-4" strokeWidth={1.7} /></button><Link to="/directory/$slug" params={{ slug: b.slug }} className="block rounded-[4px] p-3 hover:text-ap-blue">
                <span className="flex size-12 items-center justify-center rounded-[4px] border border-ap-hairline bg-ap-card">
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
