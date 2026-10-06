import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronLeft, X } from "lucide-react";
import { AppButton, AppField, AppInput, AppSelect, AppSwitch, AppTag } from "@/components/app-ui";
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
  const locked = ctx.plan.tag === "trial" || ctx.plan.tag === "ended";
  const [name, setName] = useState(ctx.brand.name);
  const [site, setSite] = useState(ctx.brand.website_url);
  const [category, setCategory] = useState<Category>(ctx.brand.category);
  const [desc, setDesc] = useState(ctx.reel?.description ?? "");
  const [tags, setTags] = useState<string[]>(ctx.prefill.tags);
  const [draft, setDraft] = useState("");
  const [moods, setMoods] = useState<string[]>(ctx.prefill.moods);
  const [show, setShow] = useState(ctx.reel?.status === "live" || ctx.reel?.status === "in_review");
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState(ctx.displayName);
  const [title, setTitle] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thumbFrame, setThumbFrame] = useState(0);
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
        adId: doc.project.id, brand: { name: name.trim(), website_url: site.trim(), category }, description: desc.trim(),
        tags, moods: moods as string[], show, fullName, jobTitle: title, agreed, posterPath,
      } });
      if (alreadyShared && show && !agreed) toast.success("Changes saved.");
      else if (res.status === "live") toast.success("Published. It's live in the Directory. Permission saved to your log.");
      else if (res.status === "in_review") toast.success("Submitted. Your first reel goes live after a quick review. Permission saved to your log.");
      else toast("Saved. This reel stays private.");
      setAgreed(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't save. Try again.");
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
  const graceEnd = ctx.plan.endedAt ? new Date(new Date(ctx.plan.endedAt).getTime() + GRACE_DAYS * 86_400_000) : null;

  return (
    <StepShell
      adId={doc.project.id}
      step="share"
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
          meta={[templateName, `${doc.frames.length} photos`, `${player.total.toFixed(1)} sec`].filter(Boolean).join(" · ")}
          formats={doc.project.formats}
          format={player.format}
          onFormat={(f) => player.setFormat(f as Format)}
          exported={doc.project.formats.map((f) => `${f} MP4`)}
        />
      }
    >
      <StepTitle
        title="Share to the Directory"
        tag={<span className={cn("rounded-md border border-ap-hairline px-2 py-0.5 text-[12px] font-semibold", locked ? "text-ap-muted" : "text-ap-badge")}>{PLAN_LABEL[ctx.plan.tag]}</span>}
        lead="Your files are ready. You can also add this reel to the Gravity Pants Directory (gravitypants.com/directory), where people search for ideas by mood, product or brand. It also appears on your brand page."
      />

      {ctx.plan.tag === "trial" && (
        <Notice action={<AppButton asChild size="sm"><Link to="/app/account/billing">See plans</Link></AppButton>}>
          Sharing to the Directory is part of paid plans. Upgrade to show your reels in search and get your own brand page.
        </Notice>
      )}
      {ctx.plan.tag === "ended" && ctx.plan.endedAt && graceEnd && (
        <Notice tone="amber" action={<AppButton asChild size="sm"><Link to="/app/account/billing">Renew plan</Link></AppButton>}>
          Your plan ended on {fmtDate(ctx.plan.endedAt)}. Your reels stay in the Directory until {fmtDate(graceEnd)}. Renew before then to keep them live. After that they're hidden, not deleted, and come back as soon as you renew.
        </Notice>
      )}
      {ctx.plan.tag === "business" && (
        <Feature on><b>Featured.</b> On the Business plan, your matching reels appear in the Featured carousel at the top of search results.</Feature>
      )}
      {ctx.plan.tag === "simple" && (
        <Feature><b>Want to be featured?</b> Brands on the Business plan appear in the Featured carousel at the top of search results. <Link to="/pricing" className="text-ap-blue">See the Business plan</Link></Feature>
      )}

      <fieldset disabled={locked} className="transition-opacity disabled:opacity-40">
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <AppField label="Brand name" htmlFor="d-name" className="mb-[18px]">
            <AppInput id="d-name" value={name} maxLength={BRAND_NAME_MAX} onChange={(e) => setName(e.target.value)} />
            <FieldCount value={name} max={BRAND_NAME_MAX} />
          </AppField>
          <AppField label="Link to your site" htmlFor="d-site" className="mb-[18px]"><AppInput id="d-site" value={site} placeholder="https://" maxLength={300} onChange={(e) => setSite(e.target.value)} /></AppField>
          <AppField label="Category" htmlFor="d-cat" className="mb-[18px]">
            <AppSelect id="d-cat" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </AppSelect>
          </AppField>
          <AppField label="Reel description" htmlFor="d-desc" className="mb-[18px]">
            <AppInput id="d-desc" value={desc} maxLength={REEL_DESCRIPTION_MAX} onChange={(e) => setDesc(e.target.value)} />
            <FieldCount value={desc} max={REEL_DESCRIPTION_MAX} />
          </AppField>
        </div>

        {doc.frames.length > 1 && (
          <AppField label="Thumbnail" className="mb-[18px]">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Thumbnail photo">
              {doc.frames.map((_, i) => (
                <button key={i} type="button" role="radio" aria-checked={thumbFrame === i} onClick={() => setThumbFrame(i)}
                  className={cn("h-9 min-w-11 rounded-lg px-3 text-[14px] nums", thumbFrame === i ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-body hover:bg-ap-media")}>
                  Photo {i + 1}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-ap-muted">Pick the photo people see first in the Directory. The preview below updates.</p>
          </AppField>
        )}

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
                <button key={s} type="button" onClick={() => addTag(s)} className="rounded-lg border border-dashed border-[#c7c7cc] bg-ap-card px-2.5 py-1 text-[13px] hover:border-ap-blue hover:text-ap-blue">+ {s}</button>
              ))}
            </div>
          )}
          <small className="text-[12px] text-ap-muted">Products, colors, occasions, anything people might search for.</small>
        </AppField>

        <AppField label="Mood" className="mb-[22px]">
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...forCategory(category), ...moods])].map((m) => {
              const on = moods.includes(m);
              return (
                <button key={m} type="button" aria-pressed={on} disabled={!on && moods.length >= 3}
                  onClick={() => setMoods(on ? moods.filter((x) => x !== m) : [...moods, m])}
                  className={cn("rounded-lg border bg-ap-card px-[13px] py-[7px] text-[14px] disabled:opacity-40", on ? "border-ap-blue font-semibold text-ap-blue" : "border-ap-hairline")}>
                  {moodLabel(m)}
                </button>
              );
            })}
          </div>
          <small className="text-[12px] text-ap-muted">Pick up to 3. Moods power searches like "show me something soothing".</small>
        </AppField>

        <div className="mb-[22px] flex items-start gap-4 rounded-[18px] bg-ap-soft-blue p-5">
          <div className="flex-1">
            <b className="mb-1 block text-[17px]">Show this reel in the Directory</b>
            <p className="text-[14px] leading-normal text-ap-body">Off by default. Turn it on to let people find it in search and on your brand page, then give permission below. Your first reel gets a quick review. After that, new reels go live straight away. You can hide any reel from My reels.</p>
          </div>
          <AppSwitch checked={show} onCheckedChange={setShow} aria-label="Show this reel in the Directory" />
        </div>

        <fieldset disabled={!show} className="mb-[22px] rounded-2xl border border-ap-hairline p-[18px] transition-opacity disabled:opacity-40">
          <h3 className="mb-1 text-[16px] font-semibold">Permission to publish</h3>
          <p className="mb-3.5 text-[13px] text-ap-muted">Needed before this reel can appear in the Directory.</p>
          <label className="mb-4 flex cursor-pointer items-start gap-2.5 text-[14px] leading-[1.55]">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-[3px] size-[18px] shrink-0 accent-ap-blue" />
            {permissionWording(brandName)}
          </label>
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            <AppField label="Your full name" htmlFor="d-full" className="mb-3">
              <AppInput id="d-full" value={fullName} onBlur={() => setTouchedName(true)} onChange={(e) => setFullName(e.target.value)} aria-invalid={touchedName && !nameOk} className={cn(touchedName && !nameOk && "border-destructive")} />
              {touchedName && !nameOk && <small className="text-[12px] text-destructive">Type your first and last name to give permission.</small>}
            </AppField>
            <AppField label="Job title (optional)" htmlFor="d-title" className="mb-3"><AppInput id="d-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></AppField>
          </div>
          <p className="rounded-[10px] bg-ap-panel px-3 py-2.5 text-[13px] leading-relaxed text-ap-body">Signed in as <b className="font-semibold text-ap-ink">{ctx.email}</b> · {ctx.role} for <b className="font-semibold text-ap-ink">{brandName}</b></p>
          <p className="mt-2.5 text-[12px] leading-normal text-ap-muted">Typing your name counts as your signature. We'll save your name, title, email, the date and time, and this exact wording in your permission log.</p>
        </fieldset>
      </fieldset>

      <div className="border-t border-ap-hairline pt-5">
        <p className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-ap-body uppercase">How it will look in search</p>
        {show ? (
          <div className="grid grid-cols-[110px_1fr] items-center gap-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-ap-media">{thumb && <img src={thumb} alt="" className="size-full object-cover" />}</div>
            <div>
              <div className="font-semibold">{brandName}</div>
              <div className="mt-0.5 mb-2 text-[13px] text-ap-muted nums">{[templateName, doc.project.formats.join(" · "), `${player.total.toFixed(1)} sec`].filter(Boolean).join(" · ")}</div>
              <div className="flex flex-wrap text-[12px] text-ap-badge">{[...moods, ...tags].map((t, i) => <span key={t}>{i > 0 && <span className="mx-1 text-ap-muted">·</span>}{t}</span>)}</div>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-ap-muted">This reel is private. Only you can see it.</p>
        )}
      </div>

      {ctx.reel && <p className="mt-4 text-[13px] text-ap-muted">Status now: <AppTag>{ctx.reel.status === "in_review" ? "In review" : ctx.reel.status === "live" ? "Live in the Directory" : ctx.reel.status === "hidden" ? "Hidden" : "Private"}</AppTag></p>}

      <StepActions>
        <AppButton asChild variant="ghost" size="lg"><Link to="/app/ad/$id/export" params={{ id: doc.project.id }}><ChevronLeft className="size-4" strokeWidth={1.7} /> Download files</Link></AppButton>
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

function Feature({ children, on }: { children: React.ReactNode; on?: boolean }) {
  return (
    <div className="mb-[22px] flex items-start gap-3 rounded-[14px] border border-ap-hairline px-4 py-3.5 text-[14px] leading-normal text-ap-body [&_b]:text-ap-ink">
      <span className={cn("grid size-[26px] shrink-0 place-items-center rounded-lg text-[13px] font-bold", on ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-muted")}>★</span>
      <p>{children}</p>
    </div>
  );
}
