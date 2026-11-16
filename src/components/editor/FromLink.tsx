import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Link2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppButton, AppInput } from "@/components/app-ui";
import { useCreateAdFromDraft, useTemplates } from "@/lib/stillframe/data";
import { getMediaUrl } from "@/lib/stillframe/media";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import type { Format } from "@/lib/stillframe/types";
import { readProductForDrafts, writeDraftsFromBrief } from "@/lib/stillframe/url-reel.functions";
import { DIFFERENCE_MAX, MUST_SAY_MAX, priceLine, type ProductBrief, type ReelDraft } from "@/lib/stillframe/url-reel";
import { getWorkspaceId } from "@/lib/stillframe/workspace";
import { cn } from "@/lib/utils";

type Photo = { assetId: string; path: string; width: number; height: number; name: string };
type Product = { name: string; price: number | null; currency: string | null };
type Read = { token: string; product: Product; photos: Photo[]; brief: ProductBrief };
type Drafts = { photos: Photo[]; drafts: ReelDraft[]; format: Format };
type Choices = { facts: boolean[]; photos: boolean[]; difference: string; mustSay: string };

const focus = "outline-none focus-visible:ring-2 focus-visible:ring-ap-blue focus-visible:ring-offset-2";
const UNUSABLE_NOTE = "Looks like a chart, logo or duplicate";

function Thumb({ path, className }: { path: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let on = true; void getMediaUrl(path).then((u) => on && setSrc(u)); return () => { on = false; }; }, [path]);
  return <div className={cn("aspect-square w-14 shrink-0 overflow-hidden rounded-[4px] bg-ap-inner", className)}>{src && <img src={src} alt="" className="h-full w-full object-cover" />}</div>;
}

const startChoices = (r: Read): Choices => ({
  facts: r.brief.facts.map(() => true),
  photos: r.photos.map((_, i) => r.brief.photos.find((p) => p.index === i)?.usable !== false),
  difference: r.brief.difference ?? "",
  mustSay: "",
});

/** New ad screen: paste a product link, check what was understood, get three drafts (each its own template, with the chosen brand kit), pick one. */
export function FromLink({ format, kitId }: { format: Format; kitId: string | null }) {
  const read = useServerFn(readProductForDrafts);
  const write = useServerFn(writeDraftsFromBrief);
  const navigate = useNavigate();
  const create = useCreateAdFromDraft();
  const { data: templates } = useTemplates();
  const locked = !usePlanAccess().canUse("ai_copy");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<null | "reading" | "writing">(null);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState<Read | null>(null);
  const [choices, setChoices] = useState<Choices | null>(null);
  const [result, setResult] = useState<Drafts | null>(null);

  const fail = (res: { error: string; locked?: boolean }) => { if (res.locked) openUpgrade("ai_copy"); setError(res.error); };

  const go = async () => {
    if (locked) { openUpgrade("ai_copy"); return; }
    setBusy("reading"); setError(null); setResult(null); setUnderstood(null);
    try {
      const res = await read({ data: { workspaceId: getWorkspaceId(), url: url.trim() } });
      if (!res.ok) fail(res as never);
      else { setUnderstood(res); setChoices(startChoices(res)); }
    } catch {
      setError("That link didn't work. Check it starts with https:// and try again.");
    } finally { setBusy(null); }
  };

  const makeDrafts = async (skip: boolean) => {
    if (!understood || !choices) return;
    setBusy("writing"); setError(null);
    const edits = skip ? null : {
      keepFacts: choices.facts.flatMap((on, i) => (on ? [i] : [])),
      keepPhotos: understood.photos.filter((_, i) => choices.photos[i]).map((p) => p.assetId),
      difference: choices.difference.trim() || null,
      mustSay: choices.mustSay.trim() || null,
    };
    try {
      const res = await write({ data: { workspaceId: getWorkspaceId(), format, token: understood.token, edits } });
      if (!res.ok) fail(res as never);
      else setResult({ photos: res.photos, drafts: res.drafts, format });
    } catch {
      setError("We couldn't write the drafts. Try again.");
    } finally { setBusy(null); }
  };

  const use = async (d: ReelDraft) => {
    const template = templates?.find((t) => t.id === d.templateId);
    if (!template || !result || !understood) { toast.error("That template isn't available any more."); return; }
    try {
      const id = await create.mutateAsync({
        template, format: result.format, kitId, name: understood.product.name,
        slides: d.slides.map((s) => ({ photo: { ...result.photos[s.photo]!, url: null }, headline: s.headline, subline: s.subline })),
      });
      navigate({ to: "/app/ad/$id/edit", params: { id } });
    } catch { toast.error("Couldn't start your ad. Try again."); }
  };

  const set = (patch: Partial<Choices>) => setChoices((c) => (c ? { ...c, ...patch } : c));
  const photosOn = choices?.photos.filter(Boolean).length ?? 0;

  return (
    <section className="mb-6 rounded-[4px] bg-ap-panel p-4" aria-label="Create from a product link">
      <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-ap-ink">
        <Link2 strokeWidth={1.7} className="size-4" /> Create from a product link
        {locked && <span className="text-[12px] font-normal text-ap-muted">· Paid plans</span>}
      </div>
      <p className="mb-3 text-[13px] text-ap-body">Paste a product page. You'll get three drafts to choose from.</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) void go(); }}>
        <AppInput type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourshop.com/products/…" aria-label="Product page link" className="min-w-0 flex-1" />
        <AppButton type="submit" size="sm" className="h-10" disabled={!!busy || (!locked && !url.trim())}>
          <Sparkles strokeWidth={1.7} className="size-4" />{busy === "reading" ? "Working…" : "Make drafts"}
        </AppButton>
      </form>
      {busy === "reading" && <p className="mt-3 text-[13px] text-ap-muted">Reading the page…</p>}
      {error && <p role="alert" className="mt-3 text-[13px] text-destructive">{error}</p>}

      {understood && choices && !result && (
        <div className="mt-4 space-y-4 rounded-[4px] bg-ap-card p-3" aria-label="What we understood" role="group">
          <div>
            <div className="text-[13px] font-semibold text-ap-ink">What we understood</div>
            <div className="mt-1 text-[13px] text-ap-ink">
              {understood.product.name}
              {priceLine(understood.product.price, understood.product.currency) && <span className="tabular-nums text-ap-body"> · {priceLine(understood.product.price, understood.product.currency)}</span>}
            </div>
            <p className="text-[13px] text-ap-body">{understood.brief.what_it_is}</p>
          </div>

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-ap-ink">The one thing people should remember</span>
            <AppInput value={choices.difference} maxLength={DIFFERENCE_MAX} onChange={(e) => set({ difference: e.target.value })} placeholder="e.g. Hand-thrown in Lisbon, no two alike" />
          </label>

          <div>
            <div className="mb-1 text-[13px] font-medium text-ap-ink">Facts we found</div>
            {understood.brief.facts.length ? (
              <div className="flex flex-wrap gap-2">
                {understood.brief.facts.map((f, i) => {
                  const on = choices.facts[i];
                  return (
                    <button key={i} type="button" aria-pressed={on} onClick={() => set({ facts: choices.facts.map((x, j) => (j === i ? !x : x)) })}
                      className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-[12px]", focus,
                        on ? "border-ap-blue bg-ap-blue/10 text-ap-ink" : "border-ap-hairline text-ap-muted line-through")}>
                      {on && <Check strokeWidth={1.7} className="size-3.5 shrink-0" />}{f.text}
                    </button>
                  );
                })}
              </div>
            ) : <p className="text-[13px] text-ap-muted">We didn't find many details on the page. Add the one thing above for a better story.</p>}
          </div>

          <div>
            <div className="mb-1 text-[13px] font-medium text-ap-ink">Photos</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {understood.photos.map((p, i) => {
                const on = choices.photos[i]!;
                const note = understood.brief.photos.find((x) => x.index === i);
                const reason = note && !note.usable ? (note.shows ? `Off: ${note.shows}` : UNUSABLE_NOTE) : null;
                return (
                  <button key={p.assetId} type="button" aria-pressed={on} disabled={on && photosOn <= 1}
                    title={on && photosOn <= 1 ? "Keep at least one photo" : undefined}
                    onClick={() => set({ photos: choices.photos.map((x, j) => (j === i ? !x : x)) })}
                    className={cn("rounded-[4px] p-1 text-left", focus, on ? "ring-2 ring-ap-blue" : "opacity-50")}>
                    <Thumb path={p.path} className="w-full" />
                    <span className="mt-1 block text-[11px] leading-tight text-ap-body">{note?.shows || "Photo"}</span>
                    {!on && reason && <span className="block text-[11px] leading-tight text-ap-muted">{reason}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-ap-ink">Anything it must say? (optional)</span>
            <AppInput value={choices.mustSay} maxLength={MUST_SAY_MAX} onChange={(e) => set({ mustSay: e.target.value })} placeholder="e.g. Free shipping this week" />
          </label>

          <div className="flex items-center gap-3">
            <AppButton size="sm" disabled={!!busy || photosOn < 1} onClick={() => void makeDrafts(false)}>
              <Sparkles strokeWidth={1.7} className="size-4" />Make 3 drafts
            </AppButton>
            <button type="button" disabled={!!busy} onClick={() => void makeDrafts(true)} className={cn("rounded-lg text-[13px] text-ap-blue hover:underline", focus)}>Looks right, skip</button>
          </div>
          {busy === "writing" && <p className="text-[13px] text-ap-muted">Writing three stories…</p>}
        </div>
      )}

      {result && (
        <>
          <button type="button" onClick={() => setResult(null)} className={cn("mt-4 rounded-lg text-[13px] text-ap-blue hover:underline", focus)}>Change what we understood</button>
          <ul className="mt-3 space-y-3">
            {result.drafts.map((d, i) => (
              <li key={`${d.templateId}-${i}`} className="rounded-[4px] bg-ap-card p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ap-ink">Draft <span className="tabular-nums">{i + 1}</span> · {d.templateName}</span>
                  <span className="text-[12px] text-ap-muted">{d.shape?.name ?? d.angle}</span>
                </div>
                <ol className="space-y-2">
                  {d.slides.map((s, f) => (
                    <li key={f} className="flex items-center gap-3">
                      <Thumb path={result.photos[s.photo]!.path} />
                      <div className="min-w-0 text-[13px] leading-snug">
                        <div className="font-medium text-ap-ink">{s.headline}</div>
                        {s.subline && <div className="text-ap-body">{s.subline}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-[12px] text-ap-muted">Built on: {d.builtOn?.length ? d.builtOn.join(", ") : "the product name and price"}</p>
                <AppButton size="sm" variant="ghost" className="mt-3 w-full" disabled={create.isPending} onClick={() => void use(d)}>Use this draft</AppButton>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
