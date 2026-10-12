import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, Download, X } from "lucide-react";
import { sizeLabel } from "@/lib/stillframe/main-size";
import { AppButton, AppField, AppInput, AppSelect, AppSwitch, AppTag } from "@/components/app-ui";
import { AdPills, useSaveDoc } from "@/components/app-ui/AdPills";
import { ReelCard, StepActions, StepShell, StepTitle } from "@/components/app-ui/StepShell";
import { useReelPlayer } from "@/components/editor/ReelPreview";
import { supabase } from "@/integrations/supabase/client";
import { getShareContext, shareReel } from "@/lib/directory/directory.functions";
import { BRAND_NAME_MAX, CATEGORIES, GRACE_DAYS, REEL_DESCRIPTION_MAX, moodLabel, nearLimit, permissionWording, validFullName, type Category } from "@/lib/directory/directory";
import { MEDIA_BUCKET } from "@/lib/stillframe/media";
import { useTemplateName, type EditorDoc } from "@/lib/stillframe/data";
import type { Format } from "@/lib/stillframe/types";
import { FORMAT_SIZE } from "@/render/formats";
import { loadImages } from "@/render/images";
import { ensureFonts, mediaPaths, renderAt, restTime, type BrandStyle } from "@/render/renderFrame";
import { useMoodCatalog } from "@/lib/directory/moods";
import { cn } from "@/lib/utils";

const PLAN_LABEL = { business: "Business plan", simple: "Simple plan", trial: "Trial", ended: "Plan ended" } as const;
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString(undefined, { dateStyle: "long" });

/** Poster: frame 1 drawn at its resting point (after any fade-in), never a black first frame. */
async function makePoster(doc: EditorDoc, brand: BrandStyle, frame = 0): Promise<Blob | null> {
  const format: Format = doc.project.primary_format;
  const { width, height } = FORMAT_SIZE[format];
  const scale = 720 / Math.max(width, height);
  const W = Math.round(width * scale), H = Math.round(height * scale);
  const [images] = await Promise.all([loadImages(mediaPaths(doc.project, doc.frames)), ensureFonts(doc.frames, brand)]);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  renderAt(ctx, doc.project, doc.frames, format, restTime(doc.frames, Math.min(frame, Math.max(0, doc.frames.length - 1))), { width: W, height: H, images, brand });
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.86));
}

function suggestionsFrom(doc: EditorDoc) {
  const words = doc.frames.flatMap((f) => [f.headline?.text, f.subline?.text]).join(" ") + " " + doc.project.name;
  const stop = new Set(["the", "and", "for", "with", "your", "our", "you", "new", "from", "this", "that", "are", "all", "now", "get"]);
  return [...new Set(words.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [])].filter((w) => !stop.has(w)).slice(0, 8);
}

export function ShareStep({ initial }: { initial: EditorDoc }) {
  const doc = initial;
  const player = useReelPlayer(doc);
  const templateName = useTemplateName(doc.project.template_id);
  const qc = useQueryClient();
  const load = useServerFn(getShareContext);
  const save = useServerFn(shareReel);
  const ctx = useQuery({ queryKey: ["share", doc.project.id], queryFn: () => load({ data: { adId: doc.project.id } }) });

  if (ctx.isLoading) return <div className="ap-flow min-h-dvh" aria-busy="true" />;
  if (!ctx.data) return <div className="ap-flow grid min-h-dvh place-items-center text-ap-muted">This reel can't be shared right now. Try again.</div>;
  return <ShareForm doc={doc} player={player} templateName={templateName} ctx={ctx.data} onSaved={() => void qc.invalidateQueries({ queryKey: ["share", doc.project.id] })} save={save} />;
}

type Ctx = Awaited<ReturnType<typeof getShareContext>>;

function ShareForm({ doc, player, templateName, ctx, save, onSaved }: {
  doc: EditorDoc; player: ReturnType<typeof useReelPlayer>; templateName: string | null; ctx: Ctx;
  save: ReturnType<typeof useServerFn<typeof shareReel>>; onSaved: () => void;
}) {
  const locked = ctx.plan.tag === "ended";
  const [name, setName] = useState(ctx.brand.name);
  const [site, setSite] = useState(ctx.brand.website_url);
  const [category, setCategory] = useState<Category>(ctx.brand.category);
  const [desc, setDesc] = useState(ctx.reel?.description ?? "");
  const [aimTitle, setAimTitle] = useState(ctx.reel?.displayTitle ?? "");
  const [tags, setTags] = useState<string[]>(ctx.prefill.tags);
  const [draft, setDraft] = useState("");
  const [moods, setMoods] = useState<string[]>(ctx.prefill.moods);
  const [show, setShow] = useState(ctx.reel?.status === "live" || ctx.reel?.status === "in_review");
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState(ctx.displayName);
  const [title, setTitle] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moreMoods, setMoreMoods] = useState(false);
  const [terms, setTerms] = useState(false);
  const [thumbFrame, setThumbFrame] = useState(0);
  const { forCategory } = useMoodCatalog();
  const suggestions = useMemo(() => suggestionsFrom(doc).filter((s) => !tags.includes(s)), [doc, tags]);
  const brandName = name.trim() || "your brand";
  const nameOk = validFullName(fullName);
  const approved = !!ctx.brand.first_approved_at;
  const alreadyShared = ctx.reel?.status === "live" || ctx.reel?.status === "in_review";
  const canSubmit = !locked && !busy && name.trim().length > 0 && (!show || alreadyShared || (agreed && nameOk));
  const primaryLabel = !show ? "Done" : alreadyShared && !agreed ? "Save changes" : approved ? "Publish" : "Submit for review";

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,$/, "").toLowerCase();
    if (t && !tags.includes(t) && tags.length < 20) setTags([...tags, t.slice(0, 40)]);
    setDraft("");
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(draft); }
    else if (e.key === "Backspace" && !draft && tags.length) setTags(tags.slice(0, -1));
  };

  const submit = async () => {
    setBusy(true);
    try {
      let posterPath: string | null = null;
      if (show) {
        const blob = await makePoster(doc, player.brand, thumbFrame).catch(() => null);
        if (blob) {
          const path = `${doc.project.workspace_id}/directory/${doc.project.id}.jpg`;
          const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: true });
          if (!error) posterPath = path;
        }
      }
      const res = await save({ data: {
        adId: doc.project.id, brand: { name: name.trim(), website_url: site.trim(), category }, description: desc.trim(), displayTitle: aimTitle.trim(),
        tags, moods: moods as string[], show, fullName, jobTitle: title, agreed, posterPath,
      } });
      if (alreadyShared && show && !agreed) toast.success("Changes saved.");
      else if (res.status === "live") toast.success("Published. It's live in the Directory. Permission saved to your log.");
      else if (res.status === "in_review") toast.success("Submitted. Your first reel goes live after a quick review. Permission saved to your log.");
      else toast("Saved. This reel stays private.");
      setAgreed(false);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "That didn't save. Try again.";
      if (/Upgrade/.test(msg)) toast.error(msg, { action: { label: "See plans", onClick: () => window.open("https://gravitypants.com/pricing", "_blank", "noopener") } });
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    void makePoster(doc, player.brand, thumbFrame).then((b) => { if (b) { url = URL.createObjectURL(b); setThumb(url); } }).catch(() => undefined);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [doc, player.brand, thumbFrame]);
  const saveDoc = useSaveDoc(doc);
  const graceEnd = ctx.plan.endedAt ? new Date(new Date(ctx.plan.endedAt).getTime() + GRACE_DAYS * 86_400_000) : null;

  return (
    <StepShell
      adId={doc.project.id}
      step="share"
      pills={<AdPills doc={doc} set={saveDoc} />}
      title={{ name: doc.project.name }}
      back={{ label: "Back to Edit", to: "/app/ad/$id/edit" }}
      left={
        <ReelCard
          preview={player.preview}
          playing={player.playing}
          onTogglePlay={player.toggle}
          segments={player.segments}
          time={player.time}
          total={player.total}
          name={doc.project.name}
          meta={[templateName, `${doc.frames.length} ${doc.frames.length === 1 ? "photo" : "photos"}`, `${player.total.toFixed(1)} sec`].filter(Boolean).join(" · ")}
          formats={doc.project.formats}
          format={player.format}
          onFormat={(f) => player.setFormat(f as Format)}
          exported={doc.project.formats.map((f) => `${sizeLabel(f)} · MP4`)}
        />
      }
    >
      <StepTitle
        title="Your files are ready"
        tag={<span className={cn("rounded-md border border-ap-hairline px-2 py-0.5 text-[12px] font-semibold", locked ? "text-ap-muted" : "text-ap-badge")}>{PLAN_LABEL[ctx.plan.tag]}</span>}
      />
      <AppButton asChild size="lg" className="mb-6"><Link to="/app/ad/$id/export" params={{ id: doc.project.id }}><Download className="size-4" strokeWidth={1.7} /> Download files</Link></AppButton>

      {ctx.plan.tag === "ended" && ctx.plan.endedAt && graceEnd && (
        <Notice tone="amber" action={<AppButton asChild size="sm"><Link to="/app/account/billing">Renew plan</Link></AppButton>}>
          Your plan ended on {fmtDate(ctx.plan.endedAt)}. Your reels stay in the Directory until {fmtDate(graceEnd)}. Renew before then to keep them live. After that they're hidden, not deleted, and come back as soon as you renew.
        </Notice>
      )}

      <section className="mb-[22px] rounded-[18px] border border-ap-hairline bg-ap-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h2 className="mb-1 text-[17px] font-semibold">Share to the Directory <span className="font-normal text-ap-muted">· optional</span></h2>
            <p className="text-[14px] leading-normal text-ap-body">Let people find this reel on Aimanté and your brand page. We may also feature it on the Gravity Pants Showcase and Examples pages.</p>
          </div>
          <AppSwitch checked={show} disabled={locked} onCheckedChange={setShow} aria-label="Share to the Directory" />
        </div>

        {show && (
          <fieldset disabled={locked} className="mt-5 border-t border-ap-hairline pt-5 disabled:opacity-40">
            {ctx.plan.tag === "trial" && (
              <Notice action={<AppButton asChild size="sm"><a href="https://gravitypants.com/pricing" target="_blank" rel="noreferrer">See plans</a></AppButton>}>
                On the free trial your brand page shows up to 3 watermark-free reels. Upgrade for unlimited reels.
              </Notice>
            )}
            <div className="grid gap-x-3.5 sm:grid-cols-2">
              <AppField label="Brand name" htmlFor="d-name" className="mb-[18px]">
                <AppInput id="d-name" value={name} maxLength={BRAND_NAME_MAX} onChange={(e) => setName(e.target.value)} />
                <FieldCount value={name} max={BRAND_NAME_MAX} />
              </AppField>
              <AppField label="Category" htmlFor="d-cat" className="mb-[18px]">
                <AppSelect id="d-cat" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </AppSelect>
              </AppField>
            </div>
            <AppField label="Title" htmlFor="d-aim-title" className="mb-[18px]">
              <AppInput id="d-aim-title" value={aimTitle} placeholder="e.g. Autumn cashmere" maxLength={60} onChange={(e) => setAimTitle(e.target.value)} />
              <FieldCount value={aimTitle} max={60} />
            </AppField>

            <AppField label="Description" htmlFor="d-desc" className="mb-[18px]">
              <textarea id="d-desc" value={desc} rows={2} maxLength={REEL_DESCRIPTION_MAX} placeholder="A short line about this reel" onChange={(e) => setDesc(e.target.value)} className="w-full resize-y bg-ap-card px-3.5 py-2.5 text-[14px] leading-[1.5]" />
              <FieldCount value={desc} max={REEL_DESCRIPTION_MAX} />
            </AppField>

            <AppField label="Mood" className="mb-[18px]">
              {(() => {
                const all = [...new Set([...moods, ...forCategory(category)])];
                const list = moreMoods ? all : all.slice(0, 6);
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {list.map((m) => {
                      const on = moods.includes(m);
                      return (
                        <button key={m} type="button" aria-pressed={on} disabled={!on && moods.length >= 3}
                          onClick={() => setMoods(on ? moods.filter((x) => x !== m) : [...moods, m])}
                          className={cn("rounded-lg border bg-ap-card px-[13px] py-[7px] text-[14px] disabled:opacity-40", on ? "border-ap-blue font-semibold text-ap-blue" : "border-ap-hairline")}>
                          {moodLabel(m)}
                        </button>
                      );
                    })}
                    {all.length > 6 && (
                      <button type="button" aria-expanded={moreMoods} onClick={() => setMoreMoods(!moreMoods)} className="inline-flex items-center gap-0.5 px-2 py-[7px] text-[14px] text-ap-blue">
                        {moreMoods ? "Fewer moods" : "More moods"} <ChevronDown className={cn("size-4 transition-transform", moreMoods && "rotate-180")} strokeWidth={1.7} />
                      </button>
                    )}
                  </div>
                );
              })()}
              <small className="text-[12px] text-ap-muted">Pick up to 3.</small>
            </AppField>

            <AppField label="Keywords" className="mb-[18px]">
              <div className="flex min-h-11 flex-wrap gap-1.5 rounded-[12px] border border-ap-hairline bg-ap-card p-[7px] focus-within:border-ap-blue focus-within:shadow-ap-focus">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-ap-panel py-1 pr-1.5 pl-2.5 text-[13px] font-medium">
                    {t}
                    <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="text-ap-muted"><X className="size-3.5" strokeWidth={2} /></button>
                  </span>
                ))}
                <input value={draft} onChange={(e) => (e.target.value.endsWith(",") ? addTag(e.target.value) : setDraft(e.target.value))} onKeyDown={onTagKey} onBlur={() => draft && addTag(draft)} placeholder={tags.length ? "" : "Add a keyword and press Enter"} aria-label="Add a keyword" className="min-w-[140px] flex-1 px-1.5 py-1 outline-hidden" />
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <em className="mr-1 text-[12px] text-ap-muted not-italic">Suggested from your photos:</em>
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => addTag(s)} className="rounded-lg border border-dashed border-ap-hairline bg-ap-card px-2.5 py-1 text-[13px] hover:border-ap-blue hover:text-ap-blue">+ {s}</button>
                  ))}
                </div>
              )}
            </AppField>

            <AppField label="Thumbnail" className="mb-[18px]">
              <div className="flex items-center gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded bg-ap-media">{thumb && <img src={thumb} alt="Thumbnail preview" className="size-full object-cover" />}</div>
                {doc.frames.length > 1 && (
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Thumbnail photo">
                    {doc.frames.map((_, i) => (
                      <button key={i} type="button" role="radio" aria-checked={thumbFrame === i} onClick={() => setThumbFrame(i)}
                        className={cn("h-9 min-w-11 rounded-lg px-3 text-[14px] nums", thumbFrame === i ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-body hover:bg-ap-media")}>
                        Photo {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </AppField>

            <div className="rounded-lg border border-ap-hairline p-4">
              <label className="flex cursor-pointer items-start gap-2.5 text-[14px] leading-[1.55]">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-[3px] size-[18px] shrink-0 accent-ap-blue" />
                <span>Permission to publish. I confirm {brandName} allows this reel to appear in the Directory.</span>
              </label>
              <button type="button" aria-expanded={terms} onClick={() => setTerms(!terms)} className="mt-1 ml-7 text-[13px] text-ap-blue">Read full terms</button>
              {terms && <p className="mt-2 ml-7 text-[13px] leading-relaxed text-ap-body">{permissionWording(brandName)}</p>}
              <div className="mt-3 grid gap-x-3.5 sm:grid-cols-2">
                <AppField label="Your full name" htmlFor="d-full" className="mb-0">
                  <AppInput id="d-full" value={fullName} onBlur={() => setTouchedName(true)} onChange={(e) => setFullName(e.target.value)} aria-invalid={touchedName && !nameOk} className={cn(touchedName && !nameOk && "border-destructive")} />
                  {touchedName && !nameOk && <small className="text-[12px] text-destructive">Type your first and last name to give permission.</small>}
                </AppField>
                <AppField label="Job title (optional)" htmlFor="d-title" className="mb-0"><AppInput id="d-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></AppField>
              </div>
              <p className="mt-2.5 text-[12px] text-ap-muted">Signed in as {ctx.email}. Typing your name counts as your signature.</p>
            </div>
          </fieldset>
        )}
      </section>

      {ctx.reel && <p className="mt-4 text-[13px] text-ap-muted">Status now: <AppTag>{ctx.reel.status === "in_review" ? "In review" : ctx.reel.status === "live" ? "Live in the Directory" : ctx.reel.status === "hidden" ? "Hidden" : "Private"}</AppTag></p>}

      <StepActions>
        <AppButton asChild variant="ghost" size="lg"><Link to="/app/ad/$id/export" params={{ id: doc.project.id }}><ChevronLeft className="size-4" strokeWidth={1.7} /> Export</Link></AppButton>
        <AppButton size="lg" disabled={!canSubmit} onClick={() => void submit()}>{busy ? "Saving…" : primaryLabel}</AppButton>
      </StepActions>
    </StepShell>
  );
}

function FieldCount({ value, max }: { value: string; max: number }) {
  return <small className={cn("block text-right text-[12px] nums", nearLimit(value.length, max) ? "text-ap-amber" : "text-ap-muted")}>{value.length} / {max}</small>;
}

function Notice({ children, action, tone }: { children: React.ReactNode; action: React.ReactNode; tone?: "amber" }) {
  return (
    <div className={cn("mb-[22px] flex flex-col gap-3.5 rounded-[14px] border px-4 py-3.5 text-[14px] leading-normal sm:flex-row sm:items-center", tone === "amber" ? "border-[#f3d9a4] bg-[#fff8eb] text-[#6b4a00]" : "border-ap-hairline bg-ap-card text-ap-body")}>
      <p className="flex-1">{children}</p>
      {action}
    </div>
  );
}
