import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Copy, Download, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/admin/AdminShell";
import { adminMarketingSnapshot, adminDraftOutreach, adminDiagnoseMarketing } from "@/lib/stillframe/admin.functions";
import { outreachInput, type OutreachDraft, type OutreachInput } from "@/lib/stillframe/marketing";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  head: () => ({ meta: [
    { title: "Marketing Hub — Gravity Pants Admin" },
    { name: "description", content: "Private brand outreach drafts and marketing performance reviews." },
    { property: "og:title", content: "Marketing Hub — Gravity Pants Admin" },
    { property: "og:description", content: "Private brand outreach drafts and marketing performance reviews." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData({ queryKey: ["admin", "marketing", 30], queryFn: () => adminMarketingSnapshot({ data: { days: 30 } }), staleTime: 60000 }),
  component: MarketingHub,
});

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Couldn't copy. Select the text and copy it."); }
}
const errorMessage = (e: unknown) => e instanceof Error ? e.message : "Couldn't complete this request.";

function MarketingHub() {
  const [tab, setTab] = useState<"outreach" | "performance">("outreach");
  return <>
    <PageTitle title="Marketing Hub" />
    <div role="tablist" aria-label="Marketing views" className="mb-6 flex w-fit max-w-full gap-1 rounded-lg bg-control-fill p-1">
      <Button role="tab" aria-selected={tab === "outreach"} variant={tab === "outreach" ? "outline" : "ghost"} size="sm" onClick={() => setTab("outreach")}><Mail className="size-4" strokeWidth={1.7} />Brand outreach</Button>
      <Button role="tab" aria-selected={tab === "performance"} variant={tab === "performance" ? "outline" : "ghost"} size="sm" onClick={() => setTab("performance")}><BarChart3 className="size-4" strokeWidth={1.7} />Performance</Button>
    </div>
    <div hidden={tab !== "outreach"}><Outreach /></div>
    <div hidden={tab !== "performance"}><Performance active={tab === "performance"} /></div>
  </>;
}

function Outreach() {
  const fn = useServerFn(adminDraftOutreach);
  const [input, setInput] = useState<OutreachInput>({ website: "", brand: "", contact: "", notes: "", offer: "try_app" });
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: (value: OutreachInput) => fn({ data: value }), onSuccess: setDraft });
  const set = (field: keyof OutreachInput, value: string) => setInput((old) => ({ ...old, [field]: value }));
  return <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault(); const parsed = outreachInput.safeParse(input);
      if (!parsed.success) { setValidation(parsed.error.issues[0]?.message ?? "Check the brand details."); return; }
      setValidation(""); mutation.mutate(parsed.data);
    }}>
      <h2 className="text-lg font-semibold">A personal invitation</h2>
      <label className="block text-sm font-medium">Brand name<Input className="mt-2 bg-card" value={input.brand} maxLength={100} required onChange={(e) => set("brand", e.target.value)} /></label>
      <label className="block text-sm font-medium">Website or Instagram URL<Input className="mt-2 bg-card" value={input.website} maxLength={500} required placeholder="https://" onChange={(e) => set("website", e.target.value)} /></label>
      <label className="block text-sm font-medium">Contact name <span className="font-normal text-secondary-text">· optional</span><Input className="mt-2 bg-card" value={input.contact} maxLength={100} onChange={(e) => set("contact", e.target.value)} /></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Invitation</legend><div className="space-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="radio" name="offer" checked={input.offer === "try_app"} onChange={() => set("offer", "try_app")} />Try Gravity Pants</label>
        <label className="flex items-center gap-2"><input type="radio" name="offer" checked={input.offer === "aimante_preview"} onChange={() => set("offer", "aimante_preview")} />Offer an Aimanté preview reel</label>
      </div></fieldset>
      <label className="block text-sm font-medium">Personal notes <span className="font-normal text-secondary-text">· optional</span><Textarea className="mt-2 min-h-24 bg-card" value={input.notes} maxLength={2000} onChange={(e) => set("notes", e.target.value)} /></label>
      {(validation || mutation.error) && <p role="alert" className="text-sm text-destructive">{validation || errorMessage(mutation.error)}</p>}
      <Button type="submit" disabled={mutation.isPending} className="w-full">{mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" strokeWidth={1.7} />}{mutation.isPending ? "Reading & drafting…" : "Create invitation draft"}</Button>
      <p className="text-xs text-secondary-text">Draft only · Nothing is sent. Website reading and AI use Lovable credits.</p>
    </form>
    <section className="min-w-0 border-t border-border pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0" aria-label="Invitation draft">
      {!draft ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-secondary-text"><Mail className="size-8" strokeWidth={1.7} /><h2 className="text-base font-medium">Your invitation draft</h2>{mutation.isPending && <p role="status" className="text-sm">Reading the brand’s website…</p>}</div> : <div className="space-y-5">
        <div><h2 className="text-lg font-semibold">Brand fit</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{draft.summary}</p><p className="mt-2 text-sm text-secondary-text">{draft.angle}</p><a href={draft.source} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-xs text-link">Source: {draft.source}</a></div>
        <label className="block text-sm font-medium">Subject<Input aria-label="Draft subject" className="mt-2 bg-card" value={draft.subject} maxLength={200} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label>
        <label className="block text-sm font-medium">Email draft<Textarea aria-label="Email draft" className="mt-2 min-h-72 bg-card leading-relaxed" value={draft.email} maxLength={5000} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
        <Button variant="plain" size="sm" onClick={() => copy(`Subject: ${draft.subject}\n\n${draft.email}`)}><Copy className="size-4" strokeWidth={1.7} />Copy email</Button>
        <label className="block text-sm font-medium">DM draft<Textarea aria-label="DM draft" className="mt-2 min-h-36 bg-card leading-relaxed" value={draft.dm} maxLength={1500} onChange={(e) => setDraft({ ...draft, dm: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2"><Button variant="plain" size="sm" onClick={() => copy(draft.dm)}><Copy className="size-4" strokeWidth={1.7} />Copy DM</Button><Button variant="outline" size="sm" onClick={() => download("brand-invitation.txt", `Source: ${draft.source}\n\nSubject: ${draft.subject}\n\n${draft.email}\n\nDM\n${draft.dm}`)}><Download className="size-4" strokeWidth={1.7} />Download draft</Button></div>
      </div>}
    </section>
  </div>;
}

function Performance({ active }: { active: boolean }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const snapshotFn = useServerFn(adminMarketingSnapshot), diagnoseFn = useServerFn(adminDiagnoseMarketing);
  const query = useQuery({ queryKey: ["admin", "marketing", days], queryFn: () => snapshotFn({ data: { days } }), enabled: active, staleTime: 60000 });
  const review = useMutation({ mutationFn: (period: 7 | 30 | 90) => diagnoseFn({ data: { days: period } }) });
  const data = query.data;
  const diagnosis = review.variables === days ? review.data?.diagnosis : undefined;
  return <section className="space-y-6" aria-label="Marketing performance">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-lg bg-control-fill p-1" aria-label="Reporting period">{([7, 30, 90] as const).map((n) => <Button key={n} size="sm" variant={days === n ? "outline" : "ghost"} aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</Button>)}</div><Button disabled={!data || review.isPending} onClick={() => review.mutate(days)}>{review.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" strokeWidth={1.7} />}{review.isPending ? "Reviewing…" : "Review performance"}</Button></div>
    {query.error && <p role="alert" className="text-sm text-destructive">{errorMessage(query.error)}</p>}
    {!data && !query.error && <p role="status" className="text-sm text-secondary-text">Loading marketing figures…</p>}
    {data && <>
      <p className="text-xs text-secondary-text tabular-nums">{data.from} – {data.to} · UTC</p>
      <div className="grid grid-cols-2 gap-5 border-y border-border py-5 lg:grid-cols-4">{([["Tracked visitors", data.funnel.visitors], ["New signups", data.funnel.signups], ["Signups with an export", data.funnel.exported], ["Signups now on paid plans", data.funnel.paid]] as const).map(([label, value]) => <div key={label}><p className="text-xs text-secondary-text">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p></div>)}</div>
      <p className="text-xs leading-relaxed text-secondary-text">Visitors are browser IDs, not verified people, and may include Aimanté and preview visits. Signups belong to this date range; their export and paid outcomes are current, not necessarily within the range. These figures do not establish a visitor-to-signup conversion rate.</p>
      <h2 className="text-lg font-semibold">Signup sources</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-secondary-text"><tr className="border-b border-border">{["Source", "Campaign", "Signups", "Now paid"].map((label) => <th key={label} className="px-2 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{data.sources.map((source) => <tr key={`${source.source}|${source.campaign}`} className="border-b border-border"><td className="break-all px-2 py-3">{source.source}</td><td className="break-all px-2 py-3">{source.campaign}</td><td className="px-2 py-3 tabular-nums">{source.signups}</td><td className="px-2 py-3 tabular-nums">{source.paid}</td></tr>)}{!data.sources.length && <tr><td colSpan={4} className="py-6 text-secondary-text">No signups recorded in this period.</td></tr>}</tbody></table></div>
    </>}
    {review.error && <p role="alert" className="text-sm text-destructive">{errorMessage(review.error)}</p>}
    {diagnosis && <section aria-label="Performance review" className="border-t border-border pt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Priority experiments</h2><Button variant="outline" size="sm" onClick={() => download("marketing-review.txt", `${diagnosis.summary}\n\n${diagnosis.actions.map((a, i) => `${i + 1}. ${a.title}\nEvidence: ${a.evidence}\nExperiment: ${a.experiment}\nMeasure: ${a.measure}`).join("\n\n")}`)}><Download className="size-4" strokeWidth={1.7} />Download review</Button></div><p className="mb-5 text-sm leading-relaxed">{diagnosis.summary}</p><div className="space-y-6">{diagnosis.actions.map((action, i) => <article key={action.title} className="border-l-2 border-primary pl-4"><h3 className="font-semibold"><span className="mr-2 text-primary tabular-nums">{i + 1}.</span>{action.title}</h3><p className="mt-2 text-sm text-secondary-text">{action.evidence}</p><p className="mt-2 text-sm leading-relaxed">{action.experiment}</p><p className="mt-2 text-sm"><span className="font-medium">Measure: </span>{action.measure}</p></article>)}</div><p className="mt-5 text-xs text-secondary-text">Proposed experiments · No website changes, messages or spending have been carried out.</p></section>}
  </section>;
}