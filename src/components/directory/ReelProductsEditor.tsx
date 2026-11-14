import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchProduct, fetchProductAdmin, getMyReelProducts, saveMyReelProducts, getReelProductsAdmin, saveReelProductsAdmin } from "@/lib/directory/products.functions";
import { searchMyCatalog } from "@/lib/directory/feeds.functions";
import { formatPrice } from "@/lib/directory/products";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { REEL_PRODUCTS_MAX, isHttpsUrl } from "@/lib/directory/products";

type Row = { key: string; id?: string; name: string; price: string; currency: string; url: string; image: string; source: "manual" | "link" | "feed"; catalogId?: string | null; availability?: "in_stock" | "out_of_stock" | "unknown" | undefined; syncedAt?: string | null; failures?: number };
const blank = (patch: Partial<Row> = {}): Row => ({ key: crypto.randomUUID(), name: "", price: "", currency: "USD", url: "", image: "", source: "manual", ...patch });

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Products a brand attaches to one reel; shoppers buy on the brand's site. */
export function ReelProductsEditor({ adId }: { adId: string }) {
  const load = useServerFn(getMyReelProducts);
  const save = useServerFn(saveMyReelProducts);
  const read = useServerFn(fetchProduct);
  const [link, setLink] = useState("");
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-reel-products", adId], queryFn: () => load({ data: { adId } }) });
  const [rows, setRows] = useState<Row[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setRows(q.data.products.map((p) => ({ key: p.id, id: p.id, name: p.name, price: p.price == null ? "" : String(p.price), currency: p.currency, url: p.url, image: (p.source_type === "manual" ? p.image_path : p.image_url) ?? "", source: p.source_type === "link" || p.source_type === "feed" ? p.source_type : "manual", catalogId: p.catalog_id ?? null, availability: p.availability, syncedAt: p.last_synced_at ?? null, failures: p.sync_failures ?? 0 })));
  }, [q.data]);
  if (!q.data) return null;
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const onRead = async () => {
    setNotice(null);
    if (!isHttpsUrl(link)) { setNotice("Use a link that starts with https://"); return; }
    setReading(true);
    try {
      const res = await read({ data: { adId, url: link.trim() } });
      if (!res.ok) { setNotice(res.error); return; }
      const p = res.product;
      if (!res.found) {
        setNotice("We couldn't read this page. Enter the details below.");
        setRows((l) => [...l, blank({ url: link.trim() })]);
      } else {
        setRows((l) => [...l, blank({ name: p.name ?? "", price: p.price == null ? "" : String(p.price), currency: p.currency ?? "USD", url: p.url, image: p.image_url ?? "", source: "link", availability: p.availability })]);
      }
      setLink("");
    } catch (e) { setNotice(e instanceof Error ? e.message : "We couldn't reach that page."); } finally { setReading(false); }
  };
  const errs = rows.map((r) => !r.name.trim() ? "Add a name." : !isHttpsUrl(r.url) ? "Link must start with https://" : r.image && !isHttpsUrl(r.image) ? "Image link must start with https://" : r.price && !(Number(r.price) >= 0) ? "Price must be a number." : null);
  const onSave = async () => {
    setBusy(true);
    try {
      await save({ data: { adId, products: rows.map((r) => ({ id: r.id, name: r.name.trim(), price: r.price ? Number(r.price) : null, currency: /^[A-Z]{3}$/.test(r.currency) ? r.currency : "USD", url: r.url.trim(), image_path: r.source === "manual" ? r.image.trim() || null : null, image_url: r.source === "link" ? r.image.trim() || null : null, source_type: r.source, catalog_id: r.catalogId ?? null, ...(r.availability ? { availability: r.availability } : {}) })) } });
      await qc.invalidateQueries({ queryKey: ["my-reel-products", adId] });
      toast.success("Products saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save products."); } finally { setBusy(false); }
  };
  return <div className="mt-3">
    <p className="text-[13px] font-medium text-ap-ink">Products</p>
    <p className="mb-2 text-[13px] text-ap-muted">Shown under your reel. Shoppers buy on your site.</p>
    {rows.length < REEL_PRODUCTS_MAX && <div className="mb-2 flex flex-wrap gap-2">
      <Input aria-label="Paste a product link" placeholder="Paste a product link" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onRead(); } }} className="h-9 min-w-[200px] flex-1" />
      <Button size="sm" variant="outline" disabled={reading || !link.trim()} onClick={() => void onRead()}>{reading ? "Reading…" : "Add"}</Button>
    </div>}
    {notice && <p className="mb-2 text-[13px] text-ap-amber" role="status">{notice}</p>}
    <ul className="flex flex-col gap-2">
      {rows.map((r, i) => <li key={r.key} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (drag == null || drag === i) return; setRows((l) => { const n = [...l]; const [m] = n.splice(drag, 1); if (m) n.splice(i, 0, m); return n; }); setDrag(null); }}
        className="rounded-[4px] border border-ap-hairline p-2">
        <div className="flex flex-wrap items-center gap-2">
          <GripVertical aria-label="Drag to reorder" className="size-4 flex-none cursor-grab text-ap-muted" strokeWidth={1.7} />
          <Input aria-label="Product name" placeholder="Name" value={r.name} onChange={(e) => set(i, { name: e.target.value })} className="h-9 min-w-[140px] flex-1" />
          {r.source !== "manual" && r.image && <img src={r.image} alt="" className="size-9 flex-none rounded-[4px] object-cover" />}
          <Input aria-label="Price" placeholder="Price" inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: e.target.value })} className="h-9 w-24 tabular-nums" />
          <Input aria-label="Currency" value={r.currency} maxLength={3} onChange={(e) => set(i, { currency: e.target.value.toUpperCase() })} className="h-9 w-16 uppercase" />
          <Button variant="ghost" size="icon" aria-label="Remove product" onClick={() => setRows((l) => l.filter((_, j) => j !== i))}><X className="size-4" strokeWidth={1.7} /></Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 pl-6">
          <Input aria-label="Product link" placeholder="https://yourshop.com/product" value={r.url} onChange={(e) => set(i, { url: e.target.value })} className="h-9 min-w-[180px] flex-1" />
          <Input aria-label="Image link (optional)" placeholder="Image link (optional)" value={r.image} onChange={(e) => set(i, { image: e.target.value })} className="h-9 min-w-[160px] flex-1" />
        </div>
        <div className="mt-1 flex justify-between pl-6 text-[12px]">
          <span className="flex flex-wrap gap-x-2">
            <span className="text-ap-muted">{r.source === "manual" ? "Entered by hand" : `${r.source === "feed" ? "From catalogue" : "From link"}${r.syncedAt ? ` · updated ${ago(r.syncedAt)}` : ""}`}</span>
            {(r.failures ?? 0) >= 3 && <span className="font-medium text-ap-amber">Needs checking</span>}
            {r.availability === "out_of_stock" && <span className="text-ap-muted">Out of stock, hidden from shoppers</span>}
            <span className="text-destructive">{errs[i]}</span>
          </span>
          {r.id && <span className="text-ap-muted tabular-nums">{q.data.clicks[r.id] ?? 0} {(q.data.clicks[r.id] ?? 0) === 1 ? "click" : "clicks"}</span>}
        </div>
      </li>)}
    </ul>
    <div className="mt-2 flex gap-2">
      {rows.length < REEL_PRODUCTS_MAX && <Button variant="outline" size="sm" onClick={() => setRows((l) => [...l, blank()])}><Plus className="size-4" strokeWidth={1.7} />Add product</Button>}
      {rows.length < REEL_PRODUCTS_MAX && <CatalogPicker adId={adId} room={REEL_PRODUCTS_MAX - rows.length} taken={new Set(rows.map((r) => r.catalogId).filter(Boolean) as string[])}
        onPick={(items) => setRows((l) => [...l, ...items.map((c) => blank({ name: c.name, price: c.price == null ? "" : String(c.price), currency: c.currency, url: c.url, image: c.image_url ?? "", source: "feed", catalogId: c.id, availability: c.availability }))])} />}
      <Button size="sm" disabled={busy || errs.some(Boolean)} onClick={onSave}>Save products</Button>
    </div>
  </div>;
}

type CatalogItem = { id: string; name: string; price: number | null; currency: string; url: string; image_url: string | null; availability: "in_stock" | "out_of_stock" | "unknown" };

type AdminTarget = { reelId: string; siteReelId?: undefined } | { reelId?: undefined; siteReelId: string };

/** Admin: product rows for one Directory or website reel, saved by the surrounding form's own save button. */
export function useAdminReelProducts(target: AdminTarget) {
  const load = useServerFn(getReelProductsAdmin);
  const save = useServerFn(saveReelProductsAdmin);
  const key = target.reelId ?? target.siteReelId;
  const q = useQuery({ queryKey: ["admin-reel-products", key], enabled: !!key, queryFn: () => load({ data: { reelId: target.reelId ?? null, siteReelId: target.siteReelId ?? null } }) });
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (q.data) setRows(q.data.products.map((p) => ({ key: p.id, id: p.id, name: p.name, price: p.price == null ? "" : String(p.price), currency: p.currency, url: p.url, image: p.image_path ?? p.image_url ?? "", source: p.source_type === "link" || p.source_type === "feed" ? p.source_type : "manual" as const, availability: p.availability })));
  }, [q.data]);
  const errs = rows.map((r) => !r.name.trim() ? "Add a name." : !isHttpsUrl(r.url) ? "Link must start with https://" : r.image && !isHttpsUrl(r.image) ? "Image link must start with https://" : r.price && !(Number(r.price) >= 0) ? "Price must be a number." : null);
  const saveProducts = async () => {
    if (!key || errs.some(Boolean)) return;
    await save({ data: { reelId: target.reelId ?? null, siteReelId: target.siteReelId ?? null, products: rows.map((r) => ({ id: r.id, name: r.name.trim(), price: r.price ? Number(r.price) : null, currency: /^[A-Z]{3}$/.test(r.currency) ? r.currency : "USD", url: r.url.trim(), image_path: r.source === "manual" ? r.image.trim() || null : null, image_url: r.source === "link" ? r.image.trim() || null : null, source_type: r.source, ...(r.availability ? { availability: r.availability } : {}) })) } });
  };
  return { rows, setRows, errs, clicks: q.data?.clicks ?? {}, loaded: !!q.data || !key, saveProducts };
}

/** The shared "Products" section: rows with add, remove and drag to reorder. Save happens in the parent form. */
export function AdminProductsFields({ rows, setRows, errs, clicks }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; errs: (string | null)[]; clicks: Record<string, number> }) {
  const [drag, setDrag] = useState<number | null>(null);
  const read = useServerFn(fetchProductAdmin);
  const [link, setLink] = useState("");
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const onRead = async () => {
    setNotice(null);
    if (!isHttpsUrl(link)) { setNotice("Use a link that starts with https://"); return; }
    setReading(true);
    try {
      const res = await read({ data: { url: link.trim() } });
      if (!res.ok) { setNotice(res.error); return; }
      const p = res.product;
      if (!res.found) {
        setNotice("We couldn't read this page. Enter the details below.");
        setRows((l) => [...l, blank({ url: link.trim() })]);
      } else {
        setRows((l) => [...l, blank({ name: p.name ?? "", price: p.price == null ? "" : String(p.price), currency: p.currency ?? "USD", url: p.url, image: p.image_url ?? "", source: "link", availability: p.availability })]);
      }
      setLink("");
    } catch (e) { setNotice(e instanceof Error ? e.message : "We couldn't reach that page."); } finally { setReading(false); }
  };
  return <div className="grid gap-2 text-[13px] text-secondary-text sm:col-span-2">
    <p className="font-medium text-foreground">Products</p>
    <p>Shown under the reel on Aimanté. Shoppers buy on the brand's site.</p>
    {rows.length < REEL_PRODUCTS_MAX && <div className="flex flex-wrap gap-2">
      <Input aria-label="Paste a product link" placeholder="Paste a product link to autofill" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onRead(); } }} className="h-9 min-w-[200px] flex-1 bg-card text-foreground" />
      <Button type="button" size="sm" variant="outline" disabled={reading || !link.trim()} onClick={() => void onRead()}>{reading ? "Reading…" : "Add"}</Button>
    </div>}
    {notice && <p className="text-[13px] text-ap-amber" role="status">{notice}</p>}
    <ul className="flex flex-col gap-2">
      {rows.map((r, i) => <li key={r.key} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (drag == null || drag === i) return; setRows((l) => { const n = [...l]; const [m] = n.splice(drag, 1); if (m) n.splice(i, 0, m); return n; }); setDrag(null); }}
        className="rounded-sm border border-border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <GripVertical aria-label="Drag to reorder" className="size-4 flex-none cursor-grab text-secondary-text" strokeWidth={1.7} />
          <Input aria-label="Product name" placeholder="Name" value={r.name} onChange={(e) => set(i, { name: e.target.value })} className="h-9 min-w-[140px] flex-1 bg-card text-foreground" />
          <Input aria-label="Price" placeholder="Price" inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: e.target.value })} className="h-9 w-24 bg-card tabular-nums text-foreground" />
          <Input aria-label="Currency" value={r.currency} maxLength={3} onChange={(e) => set(i, { currency: e.target.value.toUpperCase() })} className="h-9 w-16 bg-card uppercase text-foreground" />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove product" onClick={() => setRows((l) => l.filter((_, j) => j !== i))}><X className="size-4" strokeWidth={1.7} /></Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 pl-6">
          <Input aria-label="Product link" placeholder="https://brand.com/product" value={r.url} onChange={(e) => set(i, { url: e.target.value })} className="h-9 min-w-[180px] flex-1 bg-card text-foreground" />
          <Input aria-label="Image link (optional)" placeholder="Image link (optional)" value={r.image} onChange={(e) => set(i, { image: e.target.value })} className="h-9 min-w-[160px] flex-1 bg-card text-foreground" />
        </div>
        <div className="mt-1 flex justify-between pl-6 text-[12px]">
          <span className="text-destructive">{errs[i]}</span>
          {r.id && <span className="text-secondary-text tabular-nums">{clicks[r.id] ?? 0} {(clicks[r.id] ?? 0) === 1 ? "click" : "clicks"}</span>}
        </div>
      </li>)}
    </ul>
    {rows.length < REEL_PRODUCTS_MAX && <div><Button type="button" variant="outline" size="sm" onClick={() => setRows((l) => [...l, blank()])}><Plus className="size-4" strokeWidth={1.7} />Add product</Button></div>}
  </div>;
}

/** "Add from catalogue": shown only when the brand has a connected feed. */
function CatalogPicker({ adId, room, taken, onPick }: { adId: string; room: number; taken: Set<string>; onPick: (items: CatalogItem[]) => void }) {
  const search = useServerFn(searchMyCatalog);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<CatalogItem[]>([]);
  const probe = useQuery({ queryKey: ["my-catalog", adId, ""], queryFn: () => search({ data: { adId, q: "" } }), staleTime: 60_000 });
  const list = useQuery({ queryKey: ["my-catalog", adId, q], enabled: open, queryFn: () => search({ data: { adId, q } }), staleTime: 30_000 });
  if (!probe.data?.hasCatalog) return null;
  const items = (list.data ?? probe.data).items as CatalogItem[];
  const toggle = (c: CatalogItem) => setPicked((p) => p.some((x) => x.id === c.id) ? p.filter((x) => x.id !== c.id) : p.length < room ? [...p, c] : p);
  return <>
    <Button variant="outline" size="sm" onClick={() => { setPicked([]); setOpen(true); }}>Add from catalogue</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add from catalogue</DialogTitle></DialogHeader>
        <Input aria-label="Search products" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} className="h-9" />
        <p className="text-[12px] text-ap-muted tabular-nums">{picked.length} of {room} picked</p>
        <ul className="max-h-[50vh] overflow-y-auto">
          {items.map((c) => {
            const on = picked.some((x) => x.id === c.id), used = taken.has(c.id);
            return <li key={c.id}>
              <button type="button" disabled={used || (!on && picked.length >= room)} onClick={() => toggle(c)} aria-pressed={on}
                className={"flex w-full items-center gap-3 rounded-[4px] px-2 py-2 text-left disabled:opacity-50 " + (on ? "bg-ap-soft-blue" : "hover:bg-ap-panel")}>
                {c.image_url ? <img src={c.image_url} alt="" loading="lazy" className="size-10 flex-none rounded-[4px] object-cover" /> : <span className="size-10 flex-none rounded-[4px] bg-ap-panel" />}
                <span className="min-w-0 flex-1"><span className="block truncate text-[14px]">{c.name}</span><span className="text-[12px] text-ap-muted">{used ? "Already on this reel" : c.availability === "out_of_stock" ? "Out of stock" : c.availability === "in_stock" ? "In stock" : "Stock unknown"}</span></span>
                <span className="flex-none text-[14px] font-semibold tabular-nums">{formatPrice(c.price, c.currency)}</span>
              </button>
            </li>;
          })}
          {items.length === 0 && <li className="py-6 text-center text-[13px] text-ap-muted">No products match.</li>}
        </ul>
        <DialogFooter><Button disabled={!picked.length} onClick={() => { onPick(picked); setOpen(false); }}>Add {picked.length || ""}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
