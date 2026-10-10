import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  adminAssignBrandWorkspace, adminBrandLinks, adminBrandWorkspaces, adminCreateBrand, adminSetBrandSiteReels, checkSlug,
} from "@/lib/directory/directory.functions";
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX, CATEGORIES, SLUG_MAX, toSlug, type Category } from "@/lib/directory/directory";
import { listSiteReels } from "@/lib/site/reels.functions";
import { cn } from "@/lib/utils";

const field = "h-9 w-full rounded-sm bg-control-fill px-2 text-[13px]";
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "That didn't work");

function useWorkspaces(enabled: boolean) {
  const fn = useServerFn(adminBrandWorkspaces);
  return useQuery({ queryKey: ["admin", "brand-workspaces"], queryFn: () => fn(), enabled });
}

function useAllSiteReels() {
  return useQuery({ queryKey: ["site-reels-all"], queryFn: async () => (await listSiteReels()).filter((r) => r.source !== "client") });
}

function WorkspacePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const q = useWorkspaces(true);
  const [find, setFind] = useState("");
  const list = (q.data ?? []).filter((w) => !find || `${w.name} ${w.email ?? ""}`.toLowerCase().includes(find.toLowerCase()));
  return (
    <div className="space-y-1.5">
      <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search by workspace or email" aria-label="Search workspaces" className={field} />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Client workspace" className={field}>
        <option value="">{q.isLoading ? "Loading…" : "Choose a workspace"}</option>
        {list.slice(0, 200).map((w) => <option key={w.id} value={w.id}>{w.name}{w.email ? ` · ${w.email}` : ""} · {w.plan}</option>)}
      </select>
    </div>
  );
}

function ReelPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const reels = useAllSiteReels().data ?? [];
  if (!reels.length) return <p className="text-[13px] text-secondary-text">No website reels yet.</p>;
  return (
    <div className="grid max-h-[220px] gap-1 overflow-y-auto rounded-sm bg-control-fill p-2 sm:grid-cols-2">
      {reels.map((r) => {
        const on = selected.includes(r.id);
        return (
          <label key={r.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-[13px] hover:bg-card">
            <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((x) => x !== r.id) : [...selected, r.id])} />
            <span className="truncate">{r.title} <span className="text-secondary-text">· {r.brand}</span></span>
          </label>
        );
      })}
    </div>
  );
}

/** "+ New brand page" button and dialog. */
export function NewBrandPage({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(adminCreateBrand);
  const check = useServerFn(checkSlug);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", slug: "", slugTouched: false, category: "Other" as Category, website: "", description: "", owner: "editorial" as "editorial" | "client", workspaceId: "", reels: [] as string[], affiliated: false, publication: "live" as "draft" | "live" });
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setSlug = async (slug: string) => {
    setStatus(null);
    if (!/^[a-z0-9-]{3,30}$/.test(slug)) return setStatus(slug ? "invalid" : null);
    try { setStatus(await check({ data: { slug, brandId: null } })); } catch { setStatus(null); }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await create({ data: { name: f.name, slug: f.slug, category: f.category, website: f.website, description: f.description, workspaceId: f.owner === "client" ? f.workspaceId || null : null, siteReelIds: f.reels, affiliated: f.affiliated, status: f.publication } });
      toast.success(`Brand page created at /directory/${r.slug}`);
      setOpen(false); setF({ ...f, name: "", slug: "", slugTouched: false, website: "", description: "", workspaceId: "", reels: [] }); onCreated();
    } catch (e) { err(e); } finally { setBusy(false); }
  };
  const ok = f.name.trim() && status === "available" && (f.owner === "editorial" || f.workspaceId);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ New brand page</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] max-w-[560px] overflow-y-auto">
          <DialogTitle>New brand page</DialogTitle>
          <div className="space-y-3 text-[13px]">
            <label className="block space-y-1"><span className="font-medium">Brand name</span>
              <input value={f.name} maxLength={BRAND_NAME_MAX} onChange={(e) => {
                const name = e.target.value; const slug = f.slugTouched ? f.slug : toSlug(name).slice(0, SLUG_MAX);
                setF({ ...f, name, slug }); if (!f.slugTouched) void setSlug(slug);
              }} className={field} />
              <span className="text-secondary-text nums">{f.name.length} / {BRAND_NAME_MAX}</span>
            </label>
            <label className="block space-y-1"><span className="font-medium">Page address</span>
              <span className="flex items-center gap-1.5"><span className="text-secondary-text">/directory/</span>
                <input value={f.slug} maxLength={SLUG_MAX} onChange={(e) => { const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""); setF({ ...f, slug, slugTouched: true }); void setSlug(slug); }} className={field} /></span>
              {status && <span className={status === "available" ? "text-secondary-text" : "text-warning-text"}>{status === "available" ? "Available" : status === "invalid" ? "Use 3–30 lowercase letters, numbers or dashes" : "That address is taken"}</span>}
            </label>
            <label className="block space-y-1"><span className="font-medium">Category</span>
              <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })} className={field}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="block space-y-1"><span className="font-medium">Website (optional)</span>
              <input value={f.website} placeholder="https://" onChange={(e) => setF({ ...f, website: e.target.value })} className={field} />
            </label>
            <label className="block space-y-1"><span className="font-medium">Description (optional)</span>
              <textarea value={f.description} maxLength={BRAND_DESCRIPTION_MAX} rows={3} onChange={(e) => setF({ ...f, description: e.target.value })} className="w-full rounded-sm bg-control-fill p-2 text-[13px]" />
              <span className="text-secondary-text nums">{f.description.length} / {BRAND_DESCRIPTION_MAX}</span>
            </label>
            <label className="block space-y-1"><span className="font-medium">Publication</span><select value={f.publication} onChange={(e) => setF({ ...f, publication: e.target.value === "draft" ? "draft" : "live" })} className={field}><option value="draft">Draft</option><option value="live">Live</option></select></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.affiliated} onChange={(e) => setF({ ...f, affiliated: e.target.checked })} />Affiliated</label>
            <div className="space-y-1.5"><span className="font-medium">Belongs to</span>
              <div className="flex gap-1">
                {(["editorial", "client"] as const).map((o) => (
                  <button key={o} type="button" onClick={() => setF({ ...f, owner: o })} className={cn("rounded-lg border px-3 py-1.5", f.owner === o ? "border-primary text-primary" : "border-border")}>
                    {o === "editorial" ? "Gravity Pants (editorial)" : "A client workspace"}
                  </button>
                ))}
              </div>
              <p className="text-secondary-text">{f.owner === "editorial" ? "Shows without a paid plan. You can hand it to the client later from Manage." : "Shows while the client has a paid plan."}</p>
              {f.owner === "client" && <WorkspacePicker value={f.workspaceId} onChange={(workspaceId) => setF({ ...f, workspaceId })} />}
            </div>
            <div className="space-y-1.5"><span className="font-medium">Website reels to show (optional)</span>
              <ReelPicker selected={f.reels} onChange={(reels) => setF({ ...f, reels })} />
            </div>
            <p className="text-secondary-text">Add the logo from Manage after creating the page.</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="plain" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={!ok || busy} onClick={() => void save()}>Create brand page</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** In the brand's Manage panel: who owns it, hand over to a client, linked website reels. */
export function BrandOwnership({ brandId, onChanged }: { brandId: string; onChanged: () => void }) {
  const load = useServerFn(adminBrandLinks);
  const assign = useServerFn(adminAssignBrandWorkspace);
  const setReels = useServerFn(adminSetBrandSiteReels);
  const qc = useQueryClient();
  const key = ["admin", "brand-links", brandId];
  const q = useQuery({ queryKey: key, queryFn: () => load({ data: { brandId } }) });
  const [ws, setWs] = useState("");
  const [picking, setPicking] = useState(false);
  const [reels, setReelsSel] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  if (q.isLoading) return <div className="h-24 rounded-sm bg-control-fill" aria-busy="true" />;
  if (!q.data) return <p className="border-t pt-4 text-[13px] text-secondary-text">Couldn't load ownership and website reels. <button type="button" className="text-primary" onClick={() => void q.refetch()}>Try again</button></p>;
  const d = q.data;
  const selected = reels ?? d.siteReelIds;
  const refresh = () => { void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["admin", "brand-workspaces"] }); void qc.invalidateQueries({ queryKey: ["site-reels-all"] }); onChanged(); };
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await fn(); toast.success(msg); refresh(); } catch (e) { err(e); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4 border-t pt-4 text-[13px]">
      <div className="space-y-1.5">
        <div className="font-semibold">Belongs to</div>
        <p className="text-secondary-text">{d.placeholder ? "Gravity Pants (editorial) — not linked to a client yet." : `${d.workspaceName ?? "Unknown workspace"}${d.editorial ? " · kept visible as editorial" : ""}`}</p>
        {picking ? (
          <div className="max-w-[460px] space-y-2">
            <WorkspacePicker value={ws} onChange={setWs} />
            <p className="text-secondary-text">The client gets this page, its address, logo and reels. After that it shows while they have a paid plan.</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={!ws || busy} onClick={() => void run(() => assign({ data: { brandId, workspaceId: ws, keepEditorial: false } }), "Brand page linked to the client")}>Link to this workspace</Button>
              <Button size="sm" variant="plain" onClick={() => setPicking(false)}>Cancel</Button>
            </div>
          </div>
        ) : <Button size="sm" variant="plain" onClick={() => setPicking(true)}>{d.placeholder ? "Link to a client workspace" : "Move to another workspace"}</Button>}
      </div>
      <div className="space-y-1.5">
        <div className="font-semibold nums">Website reels · {selected.length}</div>
        <ReelPicker selected={selected} onChange={setReelsSel} />
        {reels && <Button size="sm" disabled={busy} onClick={() => void run(async () => { await setReels({ data: { brandId, reelIds: selected } }); setReelsSel(null); }, "Website reels updated")}>Save website reels</Button>}
      </div>
    </div>
  );
}
