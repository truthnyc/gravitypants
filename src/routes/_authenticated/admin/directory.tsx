import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminSaveBrandSlug, listDirectoryBrands, listDirectoryReview, resolveReport, reviewDirectoryReel } from "@/lib/directory/directory.functions";
import { CATEGORIES, MOODS, STATUS_LABEL, type Category } from "@/lib/directory/directory";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/directory")({
  head: () => ({ meta: [{ title: "Directory review — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDirectory,
});

type Data = Awaited<ReturnType<typeof listDirectoryReview>>;
type Row = Data["reels"][number];
type Act = { id: string; action: "approve" | "reject" | "hide" | "review" | "edit"; reason?: string; tags?: string[]; moods?: (typeof MOODS)[number][]; category?: Category };

function AdminDirectory() {
  const list = useServerFn(listDirectoryReview);
  const review = useServerFn(reviewDirectoryReel);
  const resolve = useServerFn(resolveReport);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "directory"], queryFn: () => list() });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "directory"] });
  const act = async (a: Act, msg: string) => {
    try { await review({ data: a }); toast(msg); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't work"); }
  };
  const reels: Row[] = q.data?.reels ?? [];
  const reports = q.data?.reports ?? [];
  const waiting = reels.filter((r) => r.status === "in_review");
  const byId = new Map(reels.map((r) => [r.id, r]));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Directory review</h1>
        <p className="text-[14px] text-secondary-text">A brand's first reel waits here. After you approve it, that brand's new reels go live straight away.</p>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold nums">Waiting for review · {waiting.length}</h2>
        <div className="space-y-3">
          {waiting.map((r) => <ReviewCard key={r.id} r={r} act={act} />)}
          {!waiting.length && <p className="text-[14px] text-secondary-text">Nothing waiting.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold nums">Reported · {reports.length}</h2>
        <div className="space-y-2">
          {reports.map((x) => {
            const r = byId.get(x.reelId);
            return (
              <div key={x.id} className="flex flex-wrap items-center gap-3 rounded-sm bg-card p-3 shadow-card text-[14px]">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r ? `${r.brand} · ${r.ad}` : "Removed reel"} {r && <span className="font-normal text-secondary-text">({STATUS_LABEL[r.status]})</span>}</div>
                  <div className="text-secondary-text">{x.reason}{x.email ? ` · ${x.email}` : ""} · <span className="nums">{new Date(x.created).toLocaleString()}</span></div>
                </div>
                {r?.status === "live" && <Button size="sm" variant="plain" onClick={() => void act({ id: r.id, action: "review" }, "Pulled back into review")}>Pull back into review</Button>}
                {r?.status === "live" && <Button size="sm" variant="plain" onClick={() => void act({ id: r.id, action: "hide" }, "Hidden")}>Hide</Button>}
                <Button size="sm" onClick={async () => { await resolve({ data: { id: x.id } }); refresh(); }}>Mark resolved</Button>
              </div>
            );
          })}
          {!reports.length && <p className="text-[14px] text-secondary-text">No open reports.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">All Directory reels</h2>
        <table className="w-full text-left text-[13px]">
          <thead><tr className="text-secondary-text"><th className="py-1.5">Brand</th><th>Ad</th><th>Status</th><th /></tr></thead>
          <tbody>
            {reels.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2"><a href={`/directory/${r.slug}`} target="_blank" rel="noreferrer" className="text-link">{r.brand}</a></td>
                <td>{r.ad}</td>
                <td>{STATUS_LABEL[r.status]}{r.note && r.status === "private" ? ` · Not approved: ${r.note}` : ""}</td>
                <td className="space-x-2 py-1.5 text-right">
                  {r.status === "live" && <Button size="sm" variant="plain" onClick={() => void act({ id: r.id, action: "review" }, "Pulled back into review")}>Pull back into review</Button>}
                  {r.status === "live" && <Button size="sm" variant="plain" onClick={() => void act({ id: r.id, action: "hide" }, "Hidden")}>Hide</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <BrandAddresses />
    </div>
  );
}

function BrandAddresses() {
  const list = useServerFn(listDirectoryBrands);
  const save = useServerFn(adminSaveBrandSlug);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "directory-brands"], queryFn: () => list() });
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const brands = q.data ?? [];
  const startEdit = (id: string, slug: string) => { setEditing(id); setValue(slug); };
  const commit = async (id: string, old: string) => {
    const v = value.trim().toLowerCase();
    if (!v || v === old) return setEditing(null);
    setBusy(true);
    try {
      await save({ data: { brandId: id, slug: v } });
      toast.success(`Address is now gravitypants.com/directory/${v}. The old address redirects for 12 months.`);
      void qc.invalidateQueries({ queryKey: ["admin", "directory-brands"] });
      void qc.invalidateQueries({ queryKey: ["admin", "directory"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save the address."); }
    finally { setBusy(false); setEditing(null); }
  };
  return (
    <section>
      <h2 className="mb-1 text-[15px] font-semibold">Brand page addresses</h2>
      <p className="mb-3 text-[13px] text-secondary-text">Every brand's Directory address. Changing one keeps the old address redirecting for 12 months.</p>
      <table className="w-full text-left text-[13px]">
        <thead><tr className="text-secondary-text"><th className="py-1.5">Brand</th><th>Workspace</th><th>Address</th><th /></tr></thead>
        <tbody>
          {brands.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="py-2 font-medium">{b.name}{!b.approved && <span className="ml-1.5 font-normal text-secondary-text">(not approved yet)</span>}</td>
              <td className="text-secondary-text">{b.workspace ?? "—"}</td>
              <td>
                {editing === b.id ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-secondary-text">/directory/</span>
                    <input autoFocus value={value} maxLength={40} onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") void commit(b.id, b.slug); if (e.key === "Escape") setEditing(null); }} aria-label={`Address for ${b.name}`} className="h-8 w-[180px] rounded-lg border border-border bg-card px-2 text-[13px] outline-hidden focus:border-primary" />
                    <Button size="sm" disabled={busy || !/^[a-z0-9-]{3,40}$/.test(value.trim())} onClick={() => void commit(b.id, b.slug)}>Save</Button>
                  </span>
                ) : (
                  <a href={`/directory/${b.slug}`} target="_blank" rel="noreferrer" className="text-link">/directory/{b.slug}</a>
                )}
              </td>
              <td className="py-1.5 text-right">
                {editing !== b.id && <Button size="sm" variant="plain" onClick={() => startEdit(b.id, b.slug)}>Change address</Button>}
              </td>
            </tr>
          ))}
          {!brands.length && <tr className="border-t"><td colSpan={4} className="py-3 text-secondary-text">No brands yet.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function ReviewCard({ r, act }: { r: Row; act: (a: Act, msg: string) => Promise<void> }) {
  const [tags, setTags] = useState(r.tags.join(", "));
  const [moods, setMoods] = useState<string[]>(r.moods);
  const [category, setCategory] = useState<Category>((r.category as Category) ?? "Other");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const edits = { tags: tags.split(",").map((t) => t.trim()).filter(Boolean), moods: moods as (typeof MOODS)[number][], category };
  const p = r.permission;
  return (
    <div className="flex flex-col gap-4 rounded-sm bg-card p-4 shadow-card sm:flex-row">
      <div className="size-36 shrink-0 overflow-hidden rounded-sm bg-control-fill">{r.poster && <img src={r.poster} alt="" className="size-full object-contain" />}</div>
      <div className="min-w-0 flex-1 space-y-2 text-[14px]">
        <div className="font-semibold">{r.brand} · {r.ad}</div>
        <div className="text-secondary-text">{r.website ? <a href={r.website} target="_blank" rel="noreferrer" className="text-link">{r.website}</a> : "No website"}{r.description ? ` · ${r.description}` : ""}</div>
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="h-8 rounded-sm bg-control-fill px-2 text-[13px]">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <input value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Tags" placeholder="Tags, comma separated" className="h-8 min-w-[220px] flex-1 rounded-sm bg-control-fill px-2 text-[13px]" />
        </div>
        <div className="flex flex-wrap gap-1">
          {MOODS.map((m) => {
            const on = moods.includes(m);
            return <button key={m} type="button" disabled={!on && moods.length >= 3} onClick={() => setMoods(on ? moods.filter((x) => x !== m) : [...moods, m])} className={cn("rounded-lg border px-2 py-0.5 text-[12px] disabled:opacity-40", on ? "border-primary text-primary" : "border-border")}>{m}</button>;
          })}
        </div>
        <div className="rounded-sm bg-control-fill px-3 py-2 text-[12px] text-secondary-text">
          {p ? <>Permission {p.action}: <b className="text-foreground">{p.full_name}</b>{p.job_title ? `, ${p.job_title}` : ""} · {p.email} · <span className="nums">{new Date(p.created_at).toLocaleString()}</span> · wording {p.wording_version}</> : "No permission on record"}
        </div>
        {rejecting && <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Short reason, sent to the brand" className="h-9 w-full rounded-sm bg-control-fill px-2 text-[13px]" />}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!p} onClick={() => void act({ id: r.id, action: "approve", ...edits }, "Approved. The reel is live and the brand was emailed.")}>Approve</Button>
          <Button size="sm" variant="plain" onClick={() => void act({ id: r.id, action: "edit", ...edits }, "Saved")}>Save changes</Button>
          {rejecting
            ? <Button size="sm" variant="plain" disabled={!reason.trim()} onClick={() => void act({ id: r.id, action: "reject", reason }, "Not approved. The brand was emailed the reason.")}>Send rejection</Button>
            : <Button size="sm" variant="plain" onClick={() => setRejecting(true)}>Reject</Button>}
        </div>
      </div>
    </div>
  );
}
