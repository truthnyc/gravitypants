import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMyReelProducts, saveMyReelProducts } from "@/lib/directory/products.functions";
import { REEL_PRODUCTS_MAX, isHttpsUrl } from "@/lib/directory/products";

type Row = { key: string; id?: string; name: string; price: string; url: string; image: string };
const blank = (): Row => ({ key: crypto.randomUUID(), name: "", price: "", url: "", image: "" });

/** Products a brand attaches to one reel; shoppers buy on the brand's site. */
export function ReelProductsEditor({ adId }: { adId: string }) {
  const load = useServerFn(getMyReelProducts);
  const save = useServerFn(saveMyReelProducts);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-reel-products", adId], queryFn: () => load({ data: { adId } }) });
  const [rows, setRows] = useState<Row[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setRows(q.data.products.map((p) => ({ key: p.id, id: p.id, name: p.name, price: p.price == null ? "" : String(p.price), url: p.url, image: p.image_path ?? "" })));
  }, [q.data]);
  if (!q.data) return null;
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const errs = rows.map((r) => !r.name.trim() ? "Add a name." : !isHttpsUrl(r.url) ? "Link must start with https://" : r.image && !isHttpsUrl(r.image) ? "Image link must start with https://" : r.price && !(Number(r.price) >= 0) ? "Price must be a number." : null);
  const onSave = async () => {
    setBusy(true);
    try {
      await save({ data: { adId, products: rows.map((r) => ({ id: r.id, name: r.name.trim(), price: r.price ? Number(r.price) : null, currency: "USD", url: r.url.trim(), image_path: r.image.trim() || null })) } });
      await qc.invalidateQueries({ queryKey: ["my-reel-products", adId] });
      toast.success("Products saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save products."); } finally { setBusy(false); }
  };
  return <div className="mt-3">
    <p className="text-[13px] font-medium text-ap-ink">Products</p>
    <p className="mb-2 text-[13px] text-ap-muted">Shown under your reel. Shoppers buy on your site.</p>
    <ul className="flex flex-col gap-2">
      {rows.map((r, i) => <li key={r.key} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (drag == null || drag === i) return; setRows((l) => { const n = [...l]; const [m] = n.splice(drag, 1); if (m) n.splice(i, 0, m); return n; }); setDrag(null); }}
        className="rounded-[4px] border border-ap-hairline p-2">
        <div className="flex flex-wrap items-center gap-2">
          <GripVertical aria-label="Drag to reorder" className="size-4 flex-none cursor-grab text-ap-muted" strokeWidth={1.7} />
          <Input aria-label="Product name" placeholder="Name" value={r.name} onChange={(e) => set(i, { name: e.target.value })} className="h-9 min-w-[140px] flex-1" />
          <Input aria-label="Price" placeholder="Price" inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: e.target.value })} className="h-9 w-24 tabular-nums" />
          <Button variant="ghost" size="icon" aria-label="Remove product" onClick={() => setRows((l) => l.filter((_, j) => j !== i))}><X className="size-4" strokeWidth={1.7} /></Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 pl-6">
          <Input aria-label="Product link" placeholder="https://yourshop.com/product" value={r.url} onChange={(e) => set(i, { url: e.target.value })} className="h-9 min-w-[180px] flex-1" />
          <Input aria-label="Image link (optional)" placeholder="Image link (optional)" value={r.image} onChange={(e) => set(i, { image: e.target.value })} className="h-9 min-w-[160px] flex-1" />
        </div>
        <div className="mt-1 flex justify-between pl-6 text-[12px]">
          <span className="text-destructive">{errs[i]}</span>
          {r.id && <span className="text-ap-muted tabular-nums">{q.data.clicks[r.id] ?? 0} {(q.data.clicks[r.id] ?? 0) === 1 ? "click" : "clicks"}</span>}
        </div>
      </li>)}
    </ul>
    <div className="mt-2 flex gap-2">
      {rows.length < REEL_PRODUCTS_MAX && <Button variant="outline" size="sm" onClick={() => setRows((l) => [...l, blank()])}><Plus className="size-4" strokeWidth={1.7} />Add product</Button>}
      <Button size="sm" disabled={busy || errs.some(Boolean)} onClick={onSave}>Save products</Button>
    </div>
  </div>;
}
