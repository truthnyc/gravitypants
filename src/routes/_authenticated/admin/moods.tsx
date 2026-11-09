import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { autoTagAllMoods } from "@/lib/directory/mood-tagging.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageTitle } from "@/components/admin/AdminShell";
import { MOOD_FAMILIES } from "@/lib/directory/mood-admin";
import { listAdminMoods, saveAdminMood, deleteAdminMood, listMoodRequests, decideMoodRequest } from "@/lib/directory/moods.functions";

const options = queryOptions({ queryKey: ["admin", "moods"], queryFn: () => listAdminMoods() });
const requestOptions = queryOptions({ queryKey: ["admin", "mood-requests"], queryFn: () => listMoodRequests() });
export const Route = createFileRoute("/_authenticated/admin/moods")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(options),
    context.queryClient.ensureQueryData(requestOptions),
  ]),
  head: () => ({ meta: [
    { title: "Moods — Gravity Pants Admin" },
    { name: "description", content: "Manage the Gravity Pants master mood list by family." },
    { property: "og:title", content: "Moods — Gravity Pants Admin" },
    { property: "og:description", content: "Manage the Gravity Pants master mood list by family." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  errorComponent: ({ error, reset }) => <div role="alert"><p>{error instanceof Error ? error.message : "Couldn't load moods."}</p><Button variant="plain" onClick={reset}>Try again</Button></div>,
  notFoundComponent: () => <p>Moods page not found.</p>,
  component: Moods,
});

type Draft = { id?: string; name: string; family: typeof MOOD_FAMILIES[number]; page_intro?: string };
function Moods() {
  const { data } = useSuspenseQuery(options);
  const { data: requests } = useSuspenseQuery(requestOptions);
  const qc = useQueryClient();
  const save = useServerFn(saveAdminMood);
  const remove = useServerFn(deleteAdminMood);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["admin", "moods"] }), qc.invalidateQueries({ queryKey: ["mood-catalog"] }), qc.invalidateQueries({ queryKey: ["admin", "directory"] }), qc.invalidateQueries({ queryKey: ["admin", "mood-requests"] })]);
  };
  async function submit() {
    if (!draft) return;
    setBusy(true);
    try { await save({ data: draft }); await refresh(); setDraft(null); toast("Mood saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save that mood."); }
    finally { setBusy(false); }
  }
  const autoTag = useServerFn(autoTagAllMoods);
  const [tagging, setTagging] = useState(false);
  async function runAutoTag() {
    setTagging(true);
    try {
      const r = await autoTag();
      await qc.invalidateQueries();
      toast(`Added moods to ${r.reels} reels and ${r.brands} brands.${r.failed ? ` ${r.failed} couldn't be tagged.` : ""}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't auto-tag right now."); }
    finally { setTagging(false); }
  }
  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try { await remove({ data: { id: deleting.id } }); await refresh(); setDeleting(null); toast("Mood deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't delete that mood."); }
    finally { setBusy(false); }
  }
  return <>
    <PageTitle title="Moods" right={<div className="flex gap-2">
      <Button variant="outline" disabled={tagging} onClick={() => void runAutoTag()}><Sparkles className="size-4" strokeWidth={1.7} />{tagging ? "Tagging…" : "Auto-tag all reels"}</Button>
      <Button onClick={() => setDraft({ name: "", family: "Calm" })}><Plus className="size-4" strokeWidth={1.7} />Add mood</Button>
    </div>} />
    <MoodRequests requests={requests} onDone={() => void refresh()} />
    <div className="divide-y divide-border">
      {MOOD_FAMILIES.map((family) => {
        const moods = data.filter((m) => m.family === family);
        return <section key={family} className="py-5 first:pt-0">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-semibold">{family} <span className="ml-2 text-[13px] font-normal tabular-nums text-secondary-text">{moods.length}</span></h2><Button variant="plain" size="icon" aria-label={`Add mood to ${family}`} title={`Add mood to ${family}`} onClick={() => setDraft({ name: "", family })}><Plus className="size-4" strokeWidth={1.7} /></Button></div>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{moods.map((m) => <li key={m.id} className="flex min-w-0 items-center gap-1 rounded-sm border border-border bg-card py-2 pl-3 pr-1">
            <span className="min-w-0 flex-1 break-words text-[14px] capitalize">{m.name}</span>
            <Button variant="plain" size="icon" aria-label={`Edit ${m.name}`} title={`Edit ${m.name}`} onClick={() => setDraft({ id: m.id, name: m.name, family, page_intro: m.page_intro })}><Pencil className="size-4" strokeWidth={1.7} /></Button>
            <Button variant="destructive-plain" size="icon" aria-label={`Delete ${m.name}`} title={`Delete ${m.name}`} onClick={() => setDeleting(m)}><Trash2 className="size-4" strokeWidth={1.7} /></Button>
          </li>)}</ul>
          {!moods.length && <p className="text-[14px] text-secondary-text">No moods</p>}
        </section>;
      })}
    </div>
    <Dialog open={!!draft} onOpenChange={(open) => { if (!open && !busy) setDraft(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{draft?.id ? "Edit mood" : "Add mood"}</DialogTitle><DialogDescription>{draft?.id ? "Renaming updates existing brand and reel selections." : "Choose a name and family."}</DialogDescription></DialogHeader>
        {draft && <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label className="grid gap-1.5 text-[14px]">Mood name<Input autoFocus required minLength={2} maxLength={30} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="grid gap-1.5 text-[14px]">Family<select aria-label="Family" value={draft.family} onChange={(e) => { const family = MOOD_FAMILIES.find((f) => f === e.target.value); if (family) setDraft({ ...draft, family }); }} className="h-11 rounded-sm border border-input bg-card px-3">{MOOD_FAMILIES.map((f) => <option key={f}>{f}</option>)}</select></label>
          <label className="grid gap-1.5 text-[14px]">Page intro on aimante.co<Textarea rows={3} maxLength={600} value={draft.page_intro ?? ""} onChange={(e) => setDraft({ ...draft, page_intro: e.target.value })} /></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="plain" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" disabled={busy || draft.name.trim().length < 2}>{busy ? "Saving…" : "Save mood"}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.name}?</DialogTitle><DialogDescription>This removes the mood from category lists and existing brand and reel selections. This cannot be undone.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="plain" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>{busy ? "Deleting…" : "Delete mood"}</Button></div></DialogContent></Dialog>
  </>;
}

type RequestRow = { id: string; name: string; status: string; note: string | null; created_at: string; decided_at: string | null };

/** Brands ask for moods the master list doesn't have; staff add the good ones here. */
function MoodRequests({ requests, onDone }: { requests: RequestRow[]; onDone: () => void }) {
  const decide = useServerFn(decideMoodRequest);
  const [family, setFamily] = useState<Record<string, MoodFamily>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (id: string, decision: "approve" | "deny") => {
    setBusy(id);
    try {
      await decide({ data: { id, decision, ...(decision === "approve" && family[id] ? { family: family[id] } : {}) } });
      toast(decision === "approve" ? "Mood added to the list." : "Request denied.");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't decide that request."); }
    finally { setBusy(null); }
  };
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");
  return (
    <section className="mb-6 rounded-sm border border-border bg-card p-4">
      <h2 className="text-[17px] font-semibold">Requests <span className="ml-2 text-[13px] font-normal tabular-nums text-secondary-text">{pending.length}</span></h2>
      <p className="mt-1 text-[13px] text-secondary-text">Moods brands asked for that the list doesn't have yet. Approving adds the mood to the master list.</p>
      {!pending.length && <p className="mt-3 text-[14px] text-secondary-text">Nothing waiting.</p>}
      <ul className="mt-3 grid gap-2">
        {pending.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-background px-3 py-2">
            <span className="min-w-0 flex-1 text-[14px] capitalize">{r.name}</span>
            <span className="text-[12px] tabular-nums text-secondary-text">{new Date(r.created_at).toLocaleDateString()}</span>
            <select aria-label={`Family for ${r.name}`} value={family[r.id] ?? "Modern"} onChange={(e) => { const f = MOOD_FAMILIES.find((x) => x === e.target.value); if (f) setFamily({ ...family, [r.id]: f }); }} className="h-9 rounded-sm border border-input bg-card px-2 text-[14px]">
              {MOOD_FAMILIES.map((f) => <option key={f}>{f}</option>)}
            </select>
            <Button size="sm" disabled={busy === r.id} onClick={() => void run(r.id, "approve")}>Add to list</Button>
            <Button size="sm" variant="plain" disabled={busy === r.id} onClick={() => void run(r.id, "deny")}>Deny</Button>
          </li>
        ))}
      </ul>
      {decided.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] text-secondary-text">Decided ({decided.length})</summary>
          <ul className="mt-2 grid gap-1">
            {decided.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="capitalize">{r.name}</span>
                <span>{r.status}</span>
                <span className="tabular-nums text-secondary-text">{new Date(r.decided_at ?? r.created_at).toLocaleDateString()}</span>
                {r.note && <span className="text-secondary-text">{r.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}