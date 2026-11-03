import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { getMediaUrl } from "@/lib/stillframe/media";
import { getKlaviyoStatus } from "@/lib/stillframe/klaviyo.functions";
import { KlaviyoDisconnect, KlaviyoSend } from "@/components/export/KlaviyoSend";
import { disconnectShopify, getBrandHome, searchShopifyProducts, sendToShopify, startShopifyConnect, type HomeFile, type HomeReel } from "@/lib/stillframe/brand-home.functions";

export const Route = createFileRoute("/_authenticated/app/brand-home")({
  validateSearch: z.object({ shopify: z.enum(["connected", "error", "expired"]).optional() }),
  head: () => ({
    meta: [
      { title: "Brand home — Gravity Pants" },
      { name: "description", content: "All your reels in one place. Send GIFs to Klaviyo and reels to your Shopify product pages." },
      { property: "og:title", content: "Brand home — Gravity Pants" },
      { property: "og:description", content: "Your reels, Klaviyo and Shopify in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandHome,
});

const ORIGIN: Record<HomeReel["origin"], string> = { own: "Your ad", staff: "Made by Gravity Pants", live: "On Aimanté" };

function BrandHome() {
  const { shopify } = Route.useSearch();
  const load = useServerFn(getBrandHome);
  const klaviyoStatus = useServerFn(getKlaviyoStatus);
  const [home, setHome] = useState<Awaited<ReturnType<typeof getBrandHome>> | null>(null);
  const [klaviyo, setKlaviyo] = useState<boolean | null>(null);
  const refresh = () => load({ data: { workspaceId: getWorkspaceId() } }).then(setHome).catch(() => toast.error("Couldn't load your reels. Try again."));
  const refreshKlaviyo = () => klaviyoStatus({ data: { workspaceId: getWorkspaceId() } }).then((r) => setKlaviyo(r.connected)).catch(() => setKlaviyo(false));

  useEffect(() => {
    void refresh();
    void refreshKlaviyo();
    if (shopify === "connected") toast.success("Shopify store connected");
    if (shopify === "error") toast.error("Shopify didn't connect. Try again.");
    if (shopify === "expired") toast.error("That took too long. Connect Shopify again.");
  }, []);

  return (
    <main className="mx-auto max-w-[960px] space-y-5 px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Brand home</h1>
        <p className="mt-1 text-[14px] text-secondary-text">All your reels in one place. Send GIFs to Klaviyo and reels to your Shopify product pages.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-sm bg-card p-4 shadow-card">
          <h2 className="text-[15px] font-semibold">Klaviyo</h2>
          <p className="mt-1 text-[13px] text-secondary-text">{klaviyo ? "Connected." : "Tap Klaviyo next to any GIF. You'll paste your key once."}</p>
          <div className="mt-2"><KlaviyoDisconnect /></div>
        </section>
        <ShopifyCard shop={home?.shop ?? null} configured={home?.configured ?? true} loading={!home} onChange={() => void refresh()} />
      </div>

      {home === null ? (
        <p className="text-[13px] text-secondary-text">Loading your reels…</p>
      ) : home.reels.length === 0 ? (
        <section className="rounded-sm bg-card p-10 text-center shadow-card">
          <h2 className="text-[17px] font-semibold">No reels yet</h2>
          <p className="mt-1 text-[13px] text-secondary-text">Export an ad and it shows up here. Reels we make for your brand appear here too.</p>
          <Button asChild className="mt-4"><Link to="/app/ads">Go to Your Ads</Link></Button>
        </section>
      ) : (
        <div className="space-y-3">
          {home.reels.map((r) => (
            <ReelRow key={r.key} reel={r} shop={home.shop} klaviyo={klaviyo} onKlaviyo={() => void refreshKlaviyo()} />
          ))}
        </div>
      )}
    </main>
  );
}

function ShopifyCard({ shop, configured, loading, onChange }: { shop: string | null; configured: boolean; loading: boolean; onChange: () => void }) {
  const start = useServerFn(startShopifyConnect);
  const disconnect = useServerFn(disconnectShopify);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await start({ data: { workspaceId: getWorkspaceId(), shop: value } });
      if (!r.ok) { toast.error(r.error); setBusy(false); return; }
      window.location.href = r.url;
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't start. Try again."); setBusy(false); }
  };
  return (
    <section className="rounded-sm bg-card p-4 shadow-card">
      <h2 className="text-[15px] font-semibold">Shopify</h2>
      {loading ? null : shop ? (
        <p className="mt-1 text-[13px] text-secondary-text">
          Connected to <span className="text-ap-ink">{shop}</span>.{" "}
          <button className="text-ap-blue hover:underline" data-cta="brand-home-shopify-disconnect" onClick={() => void disconnect({ data: { workspaceId: getWorkspaceId() } }).then(() => { toast.success("Shopify disconnected"); onChange(); }).catch((e) => toast.error(e instanceof Error ? e.message : "Try again."))}>Disconnect</button>
        </p>
      ) : !configured ? (
        <p className="mt-1 text-[13px] text-secondary-text">Shopify connection isn't available yet.</p>
      ) : (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void go(); }}>
          <Input aria-label="Your store address" placeholder="mystore.myshopify.com" value={value} onChange={(e) => setValue(e.target.value)} />
          <Button type="submit" data-cta="brand-home-shopify-connect" disabled={busy || !value.trim()}><Store strokeWidth={1.7} /> Connect</Button>
        </form>
      )}
    </section>
  );
}

function ReelRow({ reel, shop, klaviyo, onKlaviyo }: { reel: HomeReel; shop: string | null; klaviyo: boolean | null; onKlaviyo: () => void }) {
  const [poster, setPoster] = useState<string | null>(reel.posterUrl);
  const [target, setTarget] = useState<HomeFile | null>(null);
  useEffect(() => {
    if (reel.posterRef) void getMediaUrl(reel.posterRef).then(setPoster);
  }, [reel.posterRef]);
  const visible = reel.files.filter((f) => f.kind !== "other");
  return (
    <section className="flex gap-4 rounded-sm bg-card p-4 shadow-card">
      <div className="h-[96px] w-[72px] shrink-0 overflow-hidden rounded-sm bg-ap-panel">
        {poster ? <img src={poster} alt="" className="h-full w-full object-cover" /> : reel.previewUrl ? <video src={reel.previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Link to="/app/reel/$key" params={{ key: reel.key.replace(/^own:/, "own:") }} className="text-[15px] font-semibold hover:underline">{reel.title}</Link>
          <span className="text-[12px] text-secondary-text">{ORIGIN[reel.origin]}{reel.live && reel.origin === "own" ? " · On Aimanté" : ""}</span>
        </div>
        {visible.length === 0 ? (
          <p className="mt-1 text-[13px] text-secondary-text">No files to send yet.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {visible.map((f) => (
              <li key={f.name} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span className="min-w-0 truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {f.kind === "gif" && f.source.type === "export" && <KlaviyoSend projectId={f.source.projectId} stamp={f.source.stamp} name={f.name} connected={klaviyo} onConnected={onKlaviyo} />}
                  <Button variant="ghost" size="sm" data-cta="brand-home-send-shopify" disabled={!shop} title={shop ? undefined : "Connect your Shopify store first"} onClick={() => setTarget(f)}>
                    <ShoppingBag strokeWidth={1.7} /> Shopify
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {reel.origin !== "own" && visible.length > 0 && <p className="mt-1 text-[12px] text-secondary-text">Video only. For a GIF, ask us or make it from Your Ads.</p>}
      </div>
      {target && <ShopifyPicker file={target} onClose={() => setTarget(null)} />}
    </section>
  );
}

function ShopifyPicker({ file, onClose }: { file: HomeFile; onClose: () => void }) {
  const search = useServerFn(searchShopifyProducts);
  const send = useServerFn(sendToShopify);
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<{ id: string; title: string; image: string | null }[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      void search({ data: { workspaceId: getWorkspaceId(), q } }).then((r) => {
        if (r.ok) setProducts(r.products); else { toast.error(r.error); setProducts([]); }
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else if (n.size < 20) n.add(id); return n; });
  const go = async () => {
    setBusy(true);
    const source = file.source.type === "export" ? { ...file.source, name: file.name } : file.source;
    try {
      const r = await send({ data: { workspaceId: getWorkspaceId(), source, productIds: [...picked] } });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(r.failed ? `Added to ${r.added} of ${r.added + r.failed} products` : `Added to ${r.added} product page${r.added === 1 ? "" : "s"}`);
        onClose();
      }
    } catch { toast.error("Shopify couldn't take this file. Try again."); }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add to product pages</DialogTitle>
          <DialogDescription>{file.kind === "gif" ? "The GIF goes in as a product image." : "The MP4 goes in as a product video."} Choose the products.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Search products" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="max-h-[320px] space-y-1 overflow-y-auto">
          {products === null ? <li className="text-[13px] text-secondary-text">Loading products…</li> : products.length === 0 ? <li className="text-[13px] text-secondary-text">No products found.</li> : products.map((p) => (
            <li key={p.id}>
              <button type="button" aria-pressed={picked.has(p.id)} onClick={() => toggle(p.id)} className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left text-[13px] hover:bg-ap-panel">
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-ap-panel">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}</span>
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                {picked.has(p.id) && <Check size={16} strokeWidth={1.7} className="text-ap-blue" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button data-cta="brand-home-shopify-add" disabled={busy || picked.size === 0} onClick={() => void go()}>{busy ? "Adding" : `Add to ${picked.size || ""} product${picked.size === 1 ? "" : "s"}`.replace("  ", " ")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
