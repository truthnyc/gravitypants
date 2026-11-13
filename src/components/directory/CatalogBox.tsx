import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { disconnectFeed, getMyFeed, saveFeed, syncMyFeed, testFeed } from "@/lib/directory/feeds.functions";
import { formatPrice } from "@/lib/directory/products";

function since(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}

/** Brand settings: connect a Google Shopping product feed. */
export function CatalogBox({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const load = useServerFn(getMyFeed), test = useServerFn(testFeed), save = useServerFn(saveFeed), sync = useServerFn(syncMyFeed), disconnect = useServerFn(disconnectFeed);
  const q = useQuery({ queryKey: ["my-feed", brandId], queryFn: () => load({ data: { brandId } }) });
  const src = q.data?.source ?? null;
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<null | "test" | "save" | "sync" | "disconnect">(null);
  const [preview, setPreview] = useState<null | { total: number; items: { external_id: string; name: string; price: number | null; currency: string; availability: string; image_url: string | null }[] }>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (src) setUrl(src.feed_url); }, [src?.feed_url]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["my-feed", brandId] }); void qc.invalidateQueries({ queryKey: ["my-catalog"] }); void qc.invalidateQueries({ queryKey: ["my-reel-products"] }); };
  const run = async (k: NonNullable<typeof busy>, fn: () => Promise<void>) => { setBusy(k); setError(null); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(null); } };

  return <section className="acct-card">
    <h2 className="text-[20px] font-semibold">Product catalogue</h2>
    <p className="mt-1 mb-4 text-[14px] leading-[1.5] text-ap-body">Paste the product feed you use for Google Shopping. Your store platform can create one.</p>
    <div className="flex flex-wrap gap-2">
      <Input aria-label="Feed address" placeholder="Feed address" value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 min-w-[240px] flex-1" />
      <Button variant="outline" size="sm" disabled={!!busy || !url.trim()} onClick={() => run("test", async () => {
        const r = await test({ data: { brandId, url: url.trim() } });
        if (!r.ok) { setPreview(null); setError(r.error); } else setPreview({ total: r.total, items: r.items });
      })}>{busy === "test" ? "Testing…" : "Test"}</Button>
      <Button size="sm" disabled={!!busy || !url.trim()} onClick={() => run("save", async () => {
        const r = await save({ data: { brandId, url: url.trim() } });
        refresh(); setPreview(null);
        if (r.ok) toast.success(`${r.count} products synced`); else setError(r.error ?? "We couldn't read this feed.");
      })}>{busy === "save" ? "Syncing…" : "Save and sync"}</Button>
    </div>
    {error && <p className="mt-2 text-[13px] text-destructive" role="alert">{error}</p>}
    {preview && <div className="mt-3">
      <p className="mb-1 text-[13px] text-ap-muted tabular-nums">Found {preview.total} products. First five:</p>
      <ul className="flex flex-col gap-1.5">{preview.items.map((p) => <li key={p.external_id} className="flex items-center gap-3 rounded-[4px] bg-ap-panel px-3 py-2 text-[14px]">
        {p.image_url && <img src={p.image_url} alt="" className="size-8 flex-none rounded-[4px] object-cover" />}
        <span className="min-w-0 flex-1 truncate">{p.name}</span>
        <span className="text-[12px] text-ap-muted">{p.availability === "out_of_stock" ? "Out of stock" : p.availability === "in_stock" ? "In stock" : ""}</span>
        <span className="font-semibold tabular-nums">{formatPrice(p.price, p.currency)}</span>
      </li>)}</ul>
    </div>}
    {src && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ap-hairline pt-3 text-[14px]">
      {src.status === "error"
        ? <span className="text-destructive">{src.last_error ?? "The last sync failed."}{src.product_count ? <span className="text-ap-muted tabular-nums"> Your {src.product_count} saved products are unchanged.</span> : null}</span>
        : src.status === "syncing" ? <span className="text-ap-muted">Syncing…</span>
        : <span className="tabular-nums text-ap-body">{src.product_count} products{src.last_synced_at ? ` · synced ${since(src.last_synced_at)}` : ""}</span>}
      <Button variant="outline" size="sm" disabled={!!busy} onClick={() => run("sync", async () => {
        const r = await sync({ data: { brandId } }); refresh();
        if (r.ok) toast.success(`${r.count} products synced`); else setError(r.error ?? "We couldn't read this feed.");
      })}>{busy === "sync" ? "Syncing…" : "Sync now"}</Button>
      <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => { if (window.confirm("Disconnect this feed? Products already on your reels stay, but stop updating.")) void run("disconnect", async () => { await disconnect({ data: { brandId } }); setUrl(""); refresh(); }); }}>Disconnect</Button>
    </div>}
  </section>;
}
