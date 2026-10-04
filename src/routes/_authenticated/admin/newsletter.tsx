import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, PageTitle } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { getNewsletterPopupAdmin, saveNewsletterPopup } from "@/lib/site/newsletter.functions";
import { DEFAULT_POPUP, type NewsletterPopupContent } from "@/lib/site/newsletter";
import { photoSrc } from "@/lib/site/homepage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  head: () => ({ meta: [
    { title: "Newsletter pop-up — Gravity Pants Admin" },
    { name: "description", content: "Edit the newsletter sign-up pop-up." },
    { property: "og:title", content: "Newsletter pop-up — Gravity Pants Admin" },
    { property: "og:description", content: "Edit the newsletter sign-up pop-up." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: NewsletterAdmin,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[13px] font-medium text-secondary-text">{label}</span>{children}</label>;
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-border bg-card px-4 py-3">
      <span>
        <span className="block text-[14px] font-medium">{label}</span>
        <span className="block text-[13px] text-secondary-text">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
    </label>
  );
}

function PopupPreview({ c }: { c: NewsletterPopupContent }) {
  const showImage = c.showImage && c.image;
  const split = c.layout === "split" && showImage;
  const text = (
    <div className={cn("flex-1", split ? "px-5 py-6" : "px-5 py-7")}>
      {c.eyebrow && (
        <span className="inline-block rounded-full bg-site-soft-blue px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-site-eyebrow">{c.eyebrow}</span>
      )}
      <p className="mt-2.5 text-[20px] font-bold leading-[1.1] tracking-[-0.02em] text-site-ink">
        {c.line1}{c.line2 && <><br /><span className="text-site-primary">{c.line2}</span></>}
      </p>
      {c.description && <p className="mt-2 max-w-[240px] text-[11px] leading-relaxed text-site-muted">{c.description}</p>}
      <div className="mt-5 flex flex-col gap-2">
        <div className="flex h-9 items-center rounded-[4px] border border-site-line bg-site-page px-3 text-[11px] text-site-muted">you@brand.com</div>
        <div className="flex h-9 items-center justify-center rounded-lg bg-site-primary text-[12px] font-semibold text-white">Subscribe</div>
      </div>
      {c.note && <p className="mt-3 text-[10px] font-medium text-site-muted">{c.note}</p>}
    </div>
  );
  const image = showImage && c.image && (
    <div className={cn("shrink-0 items-center justify-center bg-site-panel", split ? "hidden w-[140px] border-l border-site-line p-5 md:flex" : "flex border-t border-site-line p-4")}>
      <div className={cn("relative overflow-hidden rounded-[4px] border border-site-line bg-site-inner shadow-[0_12px_24px_rgb(0_0_0/0.12)]", split ? "aspect-[9/19] w-full" : "aspect-[16/9] w-full max-w-[320px]")}>
        <img src={photoSrc(c.image)} alt={c.image.alt} className="absolute inset-0 h-full w-full object-cover" />
        {split && (
          <div className="absolute inset-x-3 bottom-3 flex h-1 gap-1">
            <span className="h-full w-1/3 rounded-full bg-white/60" />
            <span className="h-full flex-1 rounded-full bg-white/30" />
          </div>
        )}
      </div>
    </div>
  );
  return (
    <Card className="space-y-3">
      <h2 className="text-[17px] font-semibold">Preview</h2>
      <div className="rounded-sm border border-border bg-control-fill/40 p-4">
        <div className={cn("mx-auto overflow-hidden rounded-[4px] bg-site-page font-site shadow-[0_16px_40px_rgb(0_0_0/0.15)]", split ? "max-w-[440px]" : "max-w-[340px]")}>
          {split ? <div className="flex">{text}{image}</div> : <div>{text}{image}</div>}
        </div>
      </div>
      <p className="text-[12px] text-secondary-text">Updates as you type. Save to make it live on the site.</p>
    </Card>
  );
}

function NewsletterAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(getNewsletterPopupAdmin);
  const save = useServerFn(saveNewsletterPopup);
  const content = useQuery({ queryKey: ["admin", "newsletter-popup"], queryFn: () => load() });
  const [c, setC] = useState<NewsletterPopupContent>(DEFAULT_POPUP);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (content.data) setC(content.data); }, [content.data]);

  async function run(value: NewsletterPopupContent | null, msg: string) {
    setSaving(true);
    try {
      const v = value ? { ...value, image: value.image ? { ref: value.image.ref, alt: value.image.alt } : null } : null;
      await save({ data: { value: v } });
      toast.success(msg);
      await qc.invalidateQueries({ queryKey: ["admin", "newsletter-popup"] });
      await qc.invalidateQueries({ queryKey: ["site", "newsletter-popup"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } finally { setSaving(false); }
  }
  const h = (k: keyof NewsletterPopupContent) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value });

  if (content.isLoading) return <p className="text-[14px] text-secondary-text">Loading…</p>;
  return (
    <div className="space-y-6">
      <PageTitle title="Newsletter pop-up" sub="The sign-up pop-up visitors see on the site. Changes show as soon as you save." />
      <PopupPreview c={c} />
      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Behaviour</h2>
        <Toggle label="Show the pop-up" hint="Turn off to stop showing it to visitors." checked={c.enabled} onChange={(enabled) => setC({ ...c, enabled })} />
        <Toggle label="Show the photo" hint="A reel photo next to the sign-up form." checked={c.showImage} onChange={(showImage) => setC({ ...c, showImage })} />
        <Field label="Layout">
          <div className="flex gap-2">
            {(["split", "stacked"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setC({ ...c, layout: l })}
                className={`h-10 rounded-lg border px-4 text-[14px] font-medium ${c.layout === l ? "border-primary bg-primary/5 text-primary" : "border-border text-secondary-text"}`}>
                {l === "split" ? "Side by side" : "Stacked"}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-secondary-text">Side by side puts the photo next to the form on wider screens; stacked puts it below the form. Without a photo, the pop-up is always a single column.</p>
        </Field>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Words</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label above the headline"><Input value={c.eyebrow} maxLength={40} onChange={h("eyebrow")} /></Field>
          <Field label="Line under the button"><Input value={c.note} maxLength={120} onChange={h("note")} /></Field>
          <Field label="Headline, first line"><Input value={c.line1} maxLength={60} onChange={h("line1")} /></Field>
          <Field label="Headline, second line (blue)"><Input value={c.line2} maxLength={60} onChange={h("line2")} /></Field>
        </div>
        <Field label="Paragraph"><Textarea value={c.description} maxLength={300} rows={3} onChange={h("description")} /></Field>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Photo</h2>
        <div className="flex items-start gap-4">
          <label className="relative flex aspect-[9/16] w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-sm bg-control-fill">
            {c.image ? <img src={photoSrc(c.image)} alt={c.image.alt} className="size-full object-cover" /> : <Upload className="size-5 text-secondary-text" strokeWidth={1.7} />}
            <span className="absolute bottom-2 left-2 rounded-lg bg-card/90 px-2 py-1 text-[12px] font-medium">{uploading ? "Uploading…" : c.image ? "Replace" : "Add photo"}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              setUploading(true);
              try {
                const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
                const path = `newsletter/${crypto.randomUUID()}.${ext}`;
                const { error } = await supabase.storage.from("site-reels").upload(path, f, { contentType: f.type || "image/jpeg", upsert: false });
                if (error) throw new Error(error.message);
                setC({ ...c, image: { ref: `site-reels:${path}`, alt: c.image?.alt ?? "", src: URL.createObjectURL(f) } });
              } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); } finally { setUploading(false); }
            }} />
          </label>
          <div className="flex-1 space-y-2">
            {c.image && <Input placeholder="Describe the photo" value={c.image.alt} maxLength={200} onChange={(e) => setC({ ...c, image: { ...c.image!, alt: e.target.value } })} />}
            {c.image && <button type="button" className="text-[13px] text-destructive" onClick={() => setC({ ...c, image: null })}>Remove photo</button>}
            {!c.image && <p className="text-[13px] text-secondary-text">No photo — the pop-up shows just the words and the form.</p>}
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button disabled={saving || uploading} onClick={() => run(c, "Pop-up saved")}>{saving ? "Saving…" : "Save"}</Button>
        <Button variant="outline" disabled={saving} onClick={() => run(null, "Pop-up reset to default")}>Reset to default</Button>
      </div>
    </div>
  );
}
