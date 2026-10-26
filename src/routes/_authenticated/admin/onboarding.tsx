import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTitle } from "@/components/admin/AdminShell";
import { adminBrandWorkspaces, adminCreateBrand, setBrandLogo } from "@/lib/directory/directory.functions";
import { listSiteReels } from "@/lib/site/reels.functions";
import { BRAND_NAME_MAX, BRAND_DESCRIPTION_MAX, BRAND_MOODS_MAX, CATEGORIES, SLUG_MAX, toSlug, moodLabel, type Category } from "@/lib/directory/directory";
import { useMoodCatalog } from "@/lib/directory/moods";
import { normalizeWebsite } from "@/lib/directory/application-security";

export const Route = createFileRoute("/_authenticated/admin/onboarding")({
  head: () => ({ meta: [
    { title: "Client onboarding — Gravity Pants Admin" },
    { name: "description", content: "Private client onboarding and shared Directory and Aimanté brand setup." },
    { property: "og:title", content: "Client onboarding — Gravity Pants Admin" },
    { property: "og:description", content: "Private client onboarding and shared Directory and Aimanté brand setup." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Onboarding,
});

const initial = { name: "", website: "", slug: "", description: "", category: "Other" as Category, workspace: "editorial", status: "live" as "live" | "draft", affiliated: false, moods: [] as string[], reels: [] as string[] };

function Onboarding() {
  const create = useServerFn(adminCreateBrand);
  const uploadLogo = useServerFn(setBrandLogo);
  const workspaces = useServerFn(adminBrandWorkspaces);
  const listReels = useServerFn(listSiteReels);
  const qc = useQueryClient();
  const ws = useQuery({ queryKey: ["admin", "brand-workspaces"], queryFn: () => workspaces() });
  const reels = useQuery({ queryKey: ["admin", "onboarding-reels"], queryFn: () => listReels() });
  const catalog = useMoodCatalog();
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; slug: string; name: string; status: string } | null>(null);
  const [logoError, setLogoError] = useState("");
  const update = <K extends keyof typeof initial>(key: K, value: typeof initial[K]) => setF((s) => ({ ...s, [key]: value }));
  const available = (reels.data ?? []).filter((r) => r.source !== "client" && !r.brandSlug);

  async function saveLogo(brandId: string) {
    if (!logo) return;
    const bytes = new Uint8Array(await logo.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    await uploadLogo({ data: { brandId, file: { base64: btoa(binary), type: logo.type as "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml" } } });
  }
  async function save() {
    setBusy(true); setError("");
    try {
      const website = normalizeWebsite(f.website).url;
      const result = await create({ data: { name: f.name, website, slug: f.slug, description: f.description, category: f.category, workspaceId: f.workspace === "editorial" ? null : f.workspace, siteReelIds: f.reels, moods: f.moods, affiliated: f.affiliated, status: f.status } });
      setCreated({ ...result, name: f.name, status: f.status });
      try { await saveLogo(result.id); } catch { setLogoError("The shop is saved, but its logo wasn't uploaded."); }
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), qc.invalidateQueries({ queryKey: ["site-reels"] })]);
      toast.success("Shop saved");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save the shop. Try again."); }
    finally { setBusy(false); }
  }
  if (created) return <>
    <PageTitle title="Shop saved" />
    <div className="max-w-2xl space-y-5">
      <Store strokeWidth={1.7} className="size-8 text-primary" />
      <h2 className="text-xl font-semibold">{created.name}</h2>
      <p className="text-secondary-text">{created.status === "draft" ? "Saved as a draft in Directory and Aimanté." : "Linked to Directory and Aimanté. Public visibility follows the existing publication and plan rules; a published reel is required."}</p>
      {logoError && <div role="alert" className="space-y-2 text-destructive"><p>{logoError}</p><Button disabled={busy} variant="outline" data-cta="onboarding-retry-logo" onClick={async () => { setBusy(true); try { await saveLogo(created.id); setLogoError(""); toast.success("Logo saved"); } catch { toast.error("Couldn't upload the logo. Try again."); } finally { setBusy(false); } }}>Retry logo</Button></div>}
      <div className="flex flex-wrap gap-3">
        {created.status === "live" && <Button asChild variant="outline"><a href={`https://aimante.co/b/${created.slug}`} target="_blank" rel="noreferrer" data-cta="onboarding-open-aimante">Aimanté <ArrowUpRight className="size-4" strokeWidth={1.7} /></a></Button>}
        <Button asChild variant="outline"><Link to="/admin/directory" data-cta="onboarding-manage">Manage in Directory</Link></Button>
        <Button data-cta="onboarding-another" onClick={() => { setCreated(null); setF(initial); setLogo(null); setLogoError(""); setSlugTouched(false); }}>Add another shop</Button>
      </div>
    </div>
  </>;
  return <>
    <PageTitle title="Client onboarding" />
    <form className="max-w-3xl space-y-7" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2"><span className="text-sm font-medium">Shop name</span><Input required maxLength={BRAND_NAME_MAX} value={f.name} onChange={(e) => { const name = e.target.value; setF((s) => ({ ...s, name, slug: slugTouched ? s.slug : toSlug(name), reels: available.filter((r) => r.brand.toLowerCase() === name.trim().toLowerCase()).map((r) => r.id) })); }} /></label>
        <label className="space-y-2"><span className="text-sm font-medium">Website</span><Input required value={f.website} maxLength={200} placeholder="https://" onChange={(e) => update("website", e.target.value)} /></label>
        <label className="space-y-2"><span className="text-sm font-medium">Page address</span><Input required minLength={3} maxLength={SLUG_MAX} pattern="[a-z0-9-]{3,30}" value={f.slug} onChange={(e) => { setSlugTouched(true); update("slug", e.target.value.toLowerCase()); }} /><span className="block break-all text-xs text-secondary-text">aimante.co/b/{f.slug}</span></label>
        <label className="space-y-2"><span className="text-sm font-medium">Category</span><Select value={f.category} onValueChange={(v) => { const category = CATEGORIES.find((c) => c === v); if (category) setF((s) => ({ ...s, category, moods: s.moods.filter((m) => catalog.forCategory(category).includes(m)) })); }}><SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-2 sm:col-span-2"><span className="text-sm font-medium">Description</span><Textarea maxLength={BRAND_DESCRIPTION_MAX} rows={3} value={f.description} onChange={(e) => update("description", e.target.value)} /><span className="block text-xs tabular-nums text-secondary-text">{f.description.length} / {BRAND_DESCRIPTION_MAX}</span></label>
        <label className="space-y-2"><span className="text-sm font-medium">Logo (optional)</span><Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { const file = e.target.files?.[0]; if (file && file.size > 2_000_000) { e.target.value = ""; toast.error("Choose a logo under 2 MB."); return; } setLogo(file ?? null); }} /></label>
        <label className="space-y-2"><span className="text-sm font-medium">Client workspace</span><Select value={f.workspace} onValueChange={(v) => update("workspace", v)}><SelectTrigger aria-label="Client workspace"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="editorial">Not signed up yet (editorial)</SelectItem>{(ws.data ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}{w.email ? ` · ${w.email}` : ""}</SelectItem>)}</SelectContent></Select></label>
      </div>
      <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">Moods</legend><div className="flex flex-wrap gap-2">{catalog.forCategory(f.category).map((m) => <Button key={m} type="button" size="sm" variant={f.moods.includes(m) ? "default" : "outline"} aria-pressed={f.moods.includes(m)} disabled={!f.moods.includes(m) && f.moods.length >= BRAND_MOODS_MAX} onClick={() => update("moods", f.moods.includes(m) ? f.moods.filter((x) => x !== m) : [...f.moods, m])}>{moodLabel(m)}</Button>)}</div></fieldset>
      <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">Published website reels</legend>{available.map((r) => <label key={r.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={f.reels.includes(r.id)} onChange={(e) => update("reels", e.target.checked ? [...f.reels, r.id] : f.reels.filter((id) => id !== r.id))} /><span>{r.brand} · {r.title}</span></label>)}{!available.length && <p className="text-sm text-secondary-text">No unlinked published reels.</p>}</fieldset>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-medium">Publication</span><Select value={f.status} onValueChange={(v) => update("status", v === "draft" ? "draft" : "live")}><SelectTrigger aria-label="Publication"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="live">Live</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={f.affiliated} onChange={(e) => update("affiliated", e.target.checked)} />Affiliated</label></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || ws.isLoading || reels.isLoading} data-cta="onboarding-save">{busy ? "Saving…" : "Save shop"}</Button><Button asChild variant="outline"><Link to="/admin/clients" data-cta="onboarding-cancel">Cancel</Link></Button></div>
    </form>
  </>;
}