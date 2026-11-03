import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageTitle } from "@/components/admin/AdminShell";
import { adminDeleteGuide, adminListGuides, adminSaveGuide } from "@/lib/directory/guides.functions";
import type { GuideInput, GuideSection } from "@/lib/directory/guides";
import { AIMANTE_ORIGIN } from "@/lib/site/brand-site";

const options = queryOptions({ queryKey: ["admin", "guides"], queryFn: () => adminListGuides() });
export const Route = createFileRoute("/_authenticated/admin/guides")({
  loader: ({ context }) => context.queryClient.ensureQueryData(options),
  head: () => ({ meta: [
    { title: "Guides — Gravity Pants Admin" },
    { name: "description", content: "Create and edit Aimanté gift and mood guides." },
    { property: "og:title", content: "Guides — Gravity Pants Admin" },
    { property: "og:description", content: "Create and edit Aimanté gift and mood guides." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  errorComponent: ({ error, reset }) => <div role="alert"><p>{error instanceof Error ? error.message : "Couldn't load guides."}</p><Button variant="plain" onClick={reset}>Try again</Button></div>,
  notFoundComponent: () => <p>Guides page not found.</p>,
  component: Guides,
});

const blank = (): GuideInput => ({ slug: "", title: "", seo_title: "", meta_description: "", intro: "", sections: [{ heading: "", body: "", brands: [] }], cover_image: null, moods: [], categories: [], season: null, season_label: null, start_date: null, end_date: null, status: "draft" });
const csv = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
const field = "grid gap-1.5 text-[14px]";

function Guides() {
  const { data } = useSuspenseQuery(options);
  const qc = useQueryClient();
  const save = useServerFn(adminSaveGuide);
  const remove = useServerFn(adminDeleteGuide);
  const [draft, setDraft] = useState<GuideInput | null>(null);
  const [busy, setBusy] = useState(false);
  const brandName = (id: string) => data.brands.find((b) => b.id === id)?.name ?? "Unavailable brand";

  async function submit() {
    if (!draft) return;
    setBusy(true);
    try { await save({ data: draft }); await qc.invalidateQueries({ queryKey: ["admin", "guides"] }); setDraft(null); toast("Guide saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save that guide."); }
    finally { setBusy(false); }
  }
  async function del(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    try { await remove({ data: { id } }); await qc.invalidateQueries({ queryKey: ["admin", "guides"] }); toast("Guide deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't delete that guide."); }
  }
  const setSection = (i: number, s: GuideSection) => draft && setDraft({ ...draft, sections: draft.sections.map((x, j) => (j === i ? s : x)) });

  return <>
    <PageTitle title="Guides" right={<Button onClick={() => setDraft(blank())}><Plus className="size-4" strokeWidth={1.7} />New guide</Button>} />
    <ul className="divide-y divide-border rounded-sm border border-border bg-card">
      {data.guides.map((g) => {
        const count = new Set((g.sections ?? []).flatMap((s: GuideSection) => s.brands.map((b) => b.id))).size;
        return <li key={g.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{g.title}</p>
            <p className="text-[13px] text-secondary-text tabular-nums">/guides/{g.slug} · {count} brands · {g.status === "published" ? "Published" : "Draft"}</p>
          </div>
          {g.status === "published" && <a href={`${AIMANTE_ORIGIN}/guides/${g.slug}?utm_source=admin`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${g.title}`} className="p-2 text-secondary-text hover:text-foreground"><ExternalLink className="size-4" strokeWidth={1.7} /></a>}
          <Button variant="plain" size="icon" aria-label={`Edit ${g.title}`} onClick={() => setDraft({ id: g.id, slug: g.slug, title: g.title, seo_title: g.seo_title, meta_description: g.meta_description, intro: g.intro, sections: g.sections ?? [], cover_image: g.cover_image, moods: g.moods ?? [], categories: g.categories ?? [], season: g.season, season_label: g.season_label, start_date: g.start_date, end_date: g.end_date, status: g.status })}><Pencil className="size-4" strokeWidth={1.7} /></Button>
          <Button variant="destructive-plain" size="icon" aria-label={`Delete ${g.title}`} onClick={() => void del(g.id, g.title)}><Trash2 className="size-4" strokeWidth={1.7} /></Button>
        </li>;
      })}
      {!data.guides.length && <li className="px-4 py-6 text-[14px] text-secondary-text">No guides yet</li>}
    </ul>

    <Dialog open={!!draft} onOpenChange={(open) => { if (!open && !busy) setDraft(null); }}>
      <DialogContent className="max-h-[90dvh] max-w-[760px] overflow-y-auto">
        <DialogHeader><DialogTitle>{draft?.id ? "Edit guide" : "New guide"}</DialogTitle><DialogDescription>Drafts are only visible here. Publish to show it on aimante.co/guides.</DialogDescription></DialogHeader>
        {draft && <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={field}>Title<Input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label className={field}>Address (/guides/…)<Input required value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></label>
            <label className={field}>Search title<Input value={draft.seo_title} onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })} /></label>
            <label className={field}>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value === "published" ? "published" : "draft" })} className="h-11 rounded-sm border border-input bg-card px-3"><option value="draft">Draft</option><option value="published">Published</option></select></label>
          </div>
          <label className={field}>Search description<Textarea rows={2} maxLength={320} value={draft.meta_description} onChange={(e) => setDraft({ ...draft, meta_description: e.target.value })} /></label>
          <label className={field}>Intro (separate paragraphs with a blank line)<Textarea rows={5} value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} /></label>
          <label className={field}>Cover image link (optional; otherwise the first brand's reel)<Input value={draft.cover_image ?? ""} onChange={(e) => setDraft({ ...draft, cover_image: e.target.value.trim() || null })} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={field}>Moods (comma separated)<Input value={draft.moods.join(", ")} onChange={(e) => setDraft({ ...draft, moods: csv(e.target.value) })} /></label>
            <label className={field}>Categories (comma separated)<Input value={draft.categories.join(", ")} onChange={(e) => setDraft({ ...draft, categories: csv(e.target.value) })} /></label>
            <label className={field}>Season (e.g. singles-day, holiday)<Input value={draft.season ?? ""} onChange={(e) => setDraft({ ...draft, season: e.target.value || null })} /></label>
            <label className={field}>Season name shown to visitors<Input value={draft.season_label ?? ""} onChange={(e) => setDraft({ ...draft, season_label: e.target.value || null })} /></label>
            <label className={field}>Season starts<Input type="date" value={draft.start_date ?? ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value || null })} /></label>
            <label className={field}>Season ends<Input type="date" value={draft.end_date ?? ""} onChange={(e) => setDraft({ ...draft, end_date: e.target.value || null })} /></label>
          </div>
          {draft.sections.map((s, i) => (
            <fieldset key={i} className="grid gap-3 rounded-sm border border-border p-4">
              <div className="flex items-center justify-between"><legend className="text-[14px] font-semibold">Section {i + 1}</legend>
                <Button type="button" variant="destructive-plain" size="icon" aria-label={`Remove section ${i + 1}`} onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, j) => j !== i) })}><Trash2 className="size-4" strokeWidth={1.7} /></Button></div>
              <label className={field}>Heading<Input value={s.heading} onChange={(e) => setSection(i, { ...s, heading: e.target.value })} /></label>
              <label className={field}>Short paragraph<Textarea rows={2} value={s.body} onChange={(e) => setSection(i, { ...s, body: e.target.value })} /></label>
              {s.brands.map((b, k) => (
                <div key={b.id} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-[14px]">{brandName(b.id)}</span>
                  <Input aria-label={`Why ${brandName(b.id)} fits`} placeholder="One line on why it fits" value={b.why} onChange={(e) => setSection(i, { ...s, brands: s.brands.map((x, j) => (j === k ? { ...x, why: e.target.value } : x)) })} />
                  <Button type="button" variant="plain" size="icon" aria-label={`Remove ${brandName(b.id)}`} onClick={() => setSection(i, { ...s, brands: s.brands.filter((_, j) => j !== k) })}><X className="size-4" strokeWidth={1.7} /></Button>
                </div>
              ))}
              <select aria-label="Add brand" value="" onChange={(e) => e.target.value && setSection(i, { ...s, brands: [...s.brands, { id: e.target.value, why: "" }] })} className="h-11 rounded-sm border border-input bg-card px-3 text-[14px]">
                <option value="">Add a brand…</option>
                {data.brands.filter((b) => !s.brands.some((x) => x.id === b.id)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </fieldset>
          ))}
          <Button type="button" variant="plain" onClick={() => setDraft({ ...draft, sections: [...draft.sections, { heading: "", body: "", brands: [] }] })}><Plus className="size-4" strokeWidth={1.7} />Add section</Button>
          <div className="flex justify-end gap-2"><Button type="button" variant="plain" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" disabled={busy || !draft.title.trim() || !draft.slug.trim()}>{busy ? "Saving…" : "Save guide"}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
