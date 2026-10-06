import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Pencil } from "lucide-react";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { AppButton } from "@/components/app-ui";
import { checkSlug, getDirectoryAccount, hideReel, renameDirectoryReel, saveBrandDescription, saveSlug, setBrandLogo } from "@/lib/directory/directory.functions";
import { STATUS_LABEL } from "@/lib/directory/directory";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { cn } from "@/lib/utils";
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX, CATEGORIES, GRACE_DAYS, MOODS, SLUG_MAX, BRAND_MOODS_MAX, moodLabel, moodsFor, nearLimit } from "@/lib/directory/directory";

export const Route = createFileRoute("/_authenticated/app/account_/directory")({
  head: () => ({
    meta: [
      { title: "Directory settings — Gravity Pants" },
      { name: "description", content: "Your brand page address, Directory reels and permission log." },
      { property: "og:title", content: "Directory settings — Gravity Pants" },
      { property: "og:description", content: "Your brand page, Directory reels and permission log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DirectoryAccount,
});


function DirectoryAccount() {
  const ws = getWorkspaceId();
  const load = useServerFn(getDirectoryAccount);
  const hide = useServerFn(hideReel);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["directory-account", ws], queryFn: () => load({ data: { workspaceId: ws } }) });
  const d = q.data;

  const downloadCsv = () => {
    if (!d) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["timestamp_utc", "reel", "action", "full_name", "job_title", "email", "brand", "wording_version"],
      ...d.log.map((l) => [new Date(l.created_at).toISOString(), l.reel, l.action, l.full_name, l.job_title, l.email, d.brand.name, l.wording_version])];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${d.brand.slug}-permission-log.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <main className="acct mx-auto flex w-full max-w-[780px] flex-col gap-4 px-4 pb-20 pt-9 sm:px-6">
      <h1 className="acct-h1">Account</h1>
      <AccountTabs />
      {q.isLoading ? (
        <div className="h-40 rounded-[24px] bg-ap-card" aria-busy="true" />
      ) : !d ? (
        <section className="acct-card">
          <h2 className="text-[20px] font-semibold">No brand page yet</h2>
          <p className="mt-1 text-[14px] text-ap-body">Share a reel from its Share step to create your brand page in the Gravity Pants Directory.</p>
          <AppButton asChild className="mt-4"><Link to="/app/ads">Go to Your Ads</Link></AppButton>
        </section>
      ) : (
        <>
        <section className="acct-card">
          <h2 className="text-[20px] font-semibold">Brand page</h2>
          <p className="mt-1 mb-[18px] text-[14px] leading-[1.5] text-ap-body">How your brand appears in the Gravity Pants Directory.</p>
          <div className="mb-[18px] flex items-start gap-3 rounded-[14px] border border-ap-hairline px-4 py-3.5 text-[14px] leading-[1.5] text-ap-body">
            <span className="grid size-[26px] flex-none place-items-center rounded-[8px] bg-ap-blue text-[13px] text-ap-card">★</span>
            {d.brand.featured ? (
              <span><b className="text-ap-ink">Featured brand.</b> Your matching reels appear in the Featured carousel at the top of search results.</span>
            ) : (
              <span><b className="text-ap-ink">Want to be featured?</b> On Business and Team plans, your matching reels appear in the Featured carousel at the top of search results. <Link to="/pricing" className="text-ap-blue">See plans</Link></span>
            )}
          </div>
          <LogoBox brandId={d.brand.id} name={d.brand.name} logo={d.brand.logo} onSaved={() => void qc.invalidateQueries({ queryKey: ["directory-account", ws] })} />
          <DescriptionBox brand={d.brand} onSaved={() => void qc.invalidateQueries({ queryKey: ["directory-account", ws] })} />
          <SlugBox brandId={d.brand.id} slug={d.brand.slug} onSaved={() => void qc.invalidateQueries({ queryKey: ["directory-account", ws] })} />
        </section>

        <section className="acct-card">
          <h2 className="text-[20px] font-semibold">Reels in the Directory</h2>
          <p className="mt-1 mb-4 text-[14px] leading-[1.5] text-ap-body">Share new reels from the last step of the editor. Hide any reel here at any time.</p>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead><tr className="border-b border-ap-hairline text-[13px] text-ap-muted"><th className="w-[64px] py-2" /><th className="py-2 font-medium">Reel</th><th className="py-2 font-medium">Size</th><th className="py-2 font-medium">Status</th><th /></tr></thead>
            <tbody>
              {d.reels.map((r) => {
                const until = r.status === "live" && d.brand.planEndedAt ? new Date(new Date(d.brand.planEndedAt).getTime() + GRACE_DAYS * 86400000) : null;
                const label = until ? `Live until ${until.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : r.status === "live" ? "Live" : STATUS_LABEL[r.status];
                const tone = r.status === "live" ? (until ? "text-ap-amber" : "text-ap-green") : r.status === "in_review" ? "text-ap-amber" : "text-ap-muted";
                return (
                <tr key={r.adId} className="border-b border-ap-hairline last:border-0">
                  <td className="py-3 pr-3">{r.thumb ? <img src={r.thumb} alt="" className="size-11 rounded-[8px] object-cover" /> : <span className="block size-11 rounded-[8px] bg-ap-panel" />}</td>
                  <td className="py-3"><ReelName adId={r.adId} name={r.name} onSaved={() => void qc.invalidateQueries({ queryKey: ["directory-account", ws] })} /></td>
                  <td className="py-3 nums text-ap-body">{r.size || "—"}</td>
                  <td className="py-3"><span className={cn("inline-flex items-center gap-1.5 font-medium", tone)}><span className="size-2 rounded-full bg-current" />{label}</span></td>
                  <td className="py-3 text-right">
                    {(r.status === "live" || r.status === "in_review") ? (
                      <AppButton variant="ghost" size="sm" onClick={async () => {
                        try { await hide({ data: { adId: r.adId } }); toast("Hidden from the Directory. Withdrawal saved to your log."); void qc.invalidateQueries({ queryKey: ["directory-account", ws] }); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't hide it. Try again."); }
                      }}>Hide</AppButton>
                    ) : (
                      <AppButton asChild variant="ghost" size="sm"><Link to="/app/ad/$id/share" params={{ id: r.adId }}>Share again</Link></AppButton>
                    )}
                  </td>
                </tr>
              );})}
              {!d.reels.length && <tr><td colSpan={5} className="py-4 text-ap-muted">No reels shared yet.</td></tr>}
            </tbody>
          </table>
          </div>
        </section>

        <section className="acct-card">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-semibold">Permission log</h2>
              <p className="mt-1 text-[13px] text-ap-muted">Every permission given or withdrawn for this brand. Records can't be edited or deleted.</p>
            </div>
            <AppButton variant="ghost" size="sm" onClick={downloadCsv} disabled={!d.log.length}>Download log (CSV)</AppButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead><tr className="border-b border-ap-hairline text-[12px] text-ap-muted">{["Date and time", "Reel", "Action", "Name", "Title", "Email", "Wording"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {d.log.map((l) => {
                  const t = new Date(l.created_at);
                  return (
                    <tr key={l.id} className="border-b border-ap-hairline align-top last:border-0">
                      <td className="py-2.5 pr-3 nums">{t.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}<div className="font-mono text-[12px] whitespace-nowrap text-ap-body">{t.toISOString().replace("T", " ").slice(0, 19)} UTC</div></td>
                      <td className="py-2.5 pr-3">{l.reel}</td>
                      <td className={cn("py-2.5 pr-3 font-semibold", l.action === "granted" ? "text-ap-green" : "text-destructive")}>{l.action === "granted" ? "Granted" : "Withdrawn"}</td>
                      <td className="py-2.5 pr-3">{l.full_name}</td>
                      <td className="py-2.5 pr-3">{l.job_title ?? "—"}</td>
                      <td className="py-2.5 pr-3">{l.email}</td>
                      <td className="py-2.5 pr-3" title={l.wording_text}>{l.wording_version}</td>
                    </tr>
                  );
                })}
                {!d.log.length && <tr><td colSpan={7} className="py-4 text-ap-muted">No permissions recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        </>
      )}
    </main>
  );
}

type BrandInfo = { id: string; name: string; description: string; website: string; category: string; moods: string[] };
const fieldCls = "w-full text-[14px]";
function Counter({ n, max }: { n: number; max: number }) {
  return <em className={cn("not-italic font-normal text-[12px] nums", nearLimit(n, max) ? "text-ap-amber" : "text-ap-muted")}>{n} / {max}</em>;
}
function DescriptionBox({ brand, onSaved }: { brand: BrandInfo; onSaved: () => void }) {
  const save = useServerFn(saveBrandDescription);
  const [name, setName] = useState(brand.name);
  const [website, setWebsite] = useState(brand.website);
  const [category, setCategory] = useState(brand.category);
  const [value, setValue] = useState(brand.description);
  const [moods, setMoods] = useState<string[]>(brand.moods);
  const [busy, setBusy] = useState(false);
  const changed = value.trim() !== brand.description || name.trim() !== brand.name || website.trim() !== brand.website || category !== brand.category || moods.join() !== brand.moods.join();
  const commit = async () => {
    setBusy(true);
    try {
      await save({ data: { brandId: brand.id, description: value, name: name.trim(), website: website.trim(), category: category as (typeof CATEGORIES)[number], moods: moods as (typeof MOODS)[number][] } });
      toast.success("Brand page saved.");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save your brand page"); }
    finally { setBusy(false); }
  };
  const lbl = "mb-[7px] flex justify-between text-[13px] font-semibold";
  return (
    <div className="mt-[18px]">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="block"><span className={lbl}>Brand name <Counter n={name.length} max={BRAND_NAME_MAX} /></span>
          <input value={name} maxLength={BRAND_NAME_MAX} onChange={(e) => setName(e.target.value)} className={fieldCls} /></label>
        <label className="block"><span className={lbl}>Website</span>
          <input type="url" value={website} placeholder="https://yourbrand.com" onChange={(e) => setWebsite(e.target.value)} className={fieldCls} /></label>
      </div>
      <label className="mt-4 block sm:w-1/2 sm:pr-[7px]"><span className={lbl}>Category</span>
        <select value={category} onChange={(e) => { const c = e.target.value; setCategory(c); setMoods(moods.filter((m) => (moodsFor(c) as string[]).includes(m))); }} className={fieldCls}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select></label>
      <div className="mt-4"><span className={lbl}>Moods</span>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...moodsFor(category), ...moods])].map((m) => { const on = moods.includes(m); return (
            <button key={m} type="button" aria-pressed={on} disabled={!on && moods.length >= BRAND_MOODS_MAX} onClick={() => setMoods(on ? moods.filter((x) => x !== m) : [...moods, m])}
              className={cn("h-9 rounded-lg px-3 text-[14px]", on ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-body hover:bg-ap-media", "disabled:opacity-40")}>{moodLabel(m)}</button>
          ); })}
        </div>
        <small className="mt-1.5 block text-[12px] text-ap-muted">Pick 1 to 3 moods that fit your brand. The list matches your category.</small>
      </div>
      <label htmlFor="brand-description" className={cn(lbl, "mt-4")}>Brand description <Counter n={value.length} max={BRAND_DESCRIPTION_MAX} /></label>
      <textarea id="brand-description" value={value} maxLength={BRAND_DESCRIPTION_MAX} rows={3} onChange={(e) => setValue(e.target.value)} className="w-full resize-y bg-ap-card px-3.5 py-2.5 text-[14px] leading-[1.5]" />
      <small className="mt-1.5 block text-[12px] text-ap-muted">Shown under your brand name, and used as your page's description in search engines.</small>
      <div className="mt-3 flex justify-end">
        <AppButton disabled={busy || !changed || !name.trim()} onClick={() => void commit()}>{busy ? "Saving..." : "Save"}</AppButton>
      </div>
    </div>
  );
}

function ReelName({ adId, name, onSaved }: { adId: string; name: string; onSaved: () => void }) {
  const rename = useServerFn(renameDirectoryReel);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Link to="/app/ad/$id/share" params={{ id: adId }} className="font-medium">{name}</Link>
        <button type="button" aria-label={`Rename ${name}`} onClick={() => { setValue(name); setEditing(true); }} className="text-ap-muted hover:text-ap-blue"><Pencil className="size-3.5" strokeWidth={1.7} /></button>
      </span>
    );
  }
  const save = async () => {
    const v = value.trim();
    if (!v || v === name) return setEditing(false);
    setBusy(true);
    try { await rename({ data: { adId, title: v } }); toast.success("Reel renamed."); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't rename it. Try again."); }
    finally { setBusy(false); setEditing(false); }
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <input autoFocus value={value} maxLength={80} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setEditing(false); }} aria-label="Reel title" className="h-8 w-[200px] rounded-lg border border-ap-hairline bg-ap-card px-2 text-[14px] outline-hidden focus:border-ap-blue" />
      <AppButton size="sm" disabled={busy || !value.trim()} onClick={() => void save()}>Save</AppButton>
    </span>
  );
}

function SlugBox({ brandId, slug, onSaved }: { brandId: string; slug: string; onSaved: () => void }) {
  const check = useServerFn(checkSlug);
  const save = useServerFn(saveSlug);
  const [value, setValue] = useState(slug);
  const [st, setSt] = useState<string>("yours");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const v = value.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,30}$/.test(v)) return setSt("invalid");
    const t = setTimeout(() => void check({ data: { slug: v, brandId } }).then(setSt).catch(() => setSt("invalid")), 300);
    return () => clearTimeout(t);
  }, [value, brandId, check]);
  const msg = st === "yours" ? ["✓ Yours", "text-ap-green"] : st === "available" ? ["✓ Available", "text-ap-green"] : st === "taken" || st === "reserved" ? ["✗ Taken. Try another", "text-destructive"] : ["Use 3 to 30 letters, numbers or hyphens", "text-ap-muted"];
  return (
    <div className="my-[18px] flex flex-wrap items-center gap-2.5 rounded-[14px] bg-ap-panel px-4 py-3.5 text-[14px]">
      <span className="mr-1 font-semibold">Brand page</span>
      <span className="inline-flex items-center overflow-hidden rounded-lg border border-ap-hairline bg-ap-card">
        <span className="pr-0.5 pl-2.5 whitespace-nowrap text-ap-muted">gravitypants.com/directory/</span>
        <input value={value} maxLength={SLUG_MAX} onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} aria-label="Brand page address" className="acct-bare h-9 w-[150px] pr-2.5 outline-hidden" />
      </span>
      <span className={cn("text-[13px]", msg[1])}>{msg[0]}</span>
      <span className={cn("text-[12px] nums", nearLimit(value.length, SLUG_MAX) ? "text-ap-amber" : "text-ap-muted")}>{value.length} / {SLUG_MAX}</span>
      <AppButton size="sm" disabled={st !== "available" || busy} onClick={async () => {
        setBusy(true);
        try {
          const r = await save({ data: { slug: value.trim(), brandId } });
          toast.success(`Your brand page is now gravitypants.com/directory/${r.slug}. The old address redirects for 12 months.`);
          onSaved();
        } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save. Try again."); } finally { setBusy(false); }
      }}>Save address</AppButton>
      <a href={`/directory/${slug}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-ap-blue">View page <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>
    </div>
  );
}

function LogoBox({ brandId, name, logo, onSaved }: { brandId: string; name: string; logo: string | null; onSaved: () => void }) {
  const save = useServerFn(setBrandLogo);
  const [busy, setBusy] = useState(false);
  const run = async (file: File | null) => {
    if (file && file.size > 2_000_000) { toast.error("Use a logo under 2 MB"); return; }
    setBusy(true);
    try {
      let payload = null;
      if (file) {
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        payload = { base64: btoa(bin), type: file.type as "image/png" };
      }
      await save({ data: { brandId, file: payload } });
      toast.success(file ? "Logo updated on your brand page" : "Logo removed");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save the logo"); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-4 flex items-center gap-4">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-[12px] bg-ap-panel text-[20px] font-semibold text-ap-muted">
        {logo ? <img src={logo} alt={`${name} logo`} className="size-full object-contain" /> : name.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-medium">Brand logo</span>
        <span className="text-[12px] text-ap-muted">PNG, JPG, WebP or SVG, up to 2 MB. Shown on your brand page.</span>
        <div className="mt-1 flex gap-2">
          <AppButton asChild size="sm" disabled={busy}>
            <label className="cursor-pointer">
              {busy ? "Saving..." : logo ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" disabled={busy}
                onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; if (f) void run(f); }} />
            </label>
          </AppButton>
          {logo && <AppButton variant="ghost" size="sm" disabled={busy} onClick={() => void run(null)}>Remove</AppButton>}
        </div>
      </div>
    </div>
  );
}
