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
import { getHomepageAdmin, saveHomepageSection } from "@/lib/site/homepage.functions";
import { listAdminReels, type AdminReel } from "@/lib/stillframe/admin-reels.functions";
import { DEFAULT_EXAMPLE, DEFAULT_HERO, DEFAULT_QUOTE, photoSrc, type ExampleOfWeek, type HomeHero, type HomeQuote, type SitePhoto } from "@/lib/site/homepage";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  head: () => ({ meta: [
    { title: "Homepage — Gravity Pants Admin" },
    { name: "description", content: "Edit the home banner and the Example of the week." },
    { property: "og:title", content: "Homepage — Gravity Pants Admin" },
    { property: "og:description", content: "Edit the home banner and the Example of the week." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: HomepageAdmin,
});

async function uploadPhoto(file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `homepage/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("site-reels").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return { ref: `site-reels:${path}`, src: URL.createObjectURL(file) };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[13px] font-medium text-secondary-text">{label}</span>{children}</label>;
}

function ReelPick({ value, reels, onChange }: { value: string | null; reels: AdminReel[]; onChange: (v: string | null) => void }) {
  return (
    <select className="h-11 w-full rounded-sm border border-border bg-card px-3 text-[14px]" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Purl Soho — Japanese Denim Cotton (default)</option>
      {reels.map((r) => <option key={r.id} value={r.id} disabled={!r.published}>{r.brand} — {r.title}{r.published ? "" : " (not published)"}</option>)}
    </select>
  );
}

function Photos({ photos, max, onChange }: { photos: SitePhoto[]; max: number; onChange: (p: SitePhoto[]) => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const set = (i: number, p: Partial<SitePhoto>) => onChange(photos.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const slots = Array.from({ length: max }, (_, i) => photos[i]);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {slots.map((p, i) => (
        <div key={i} className="space-y-2">
          <label className="relative flex aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden rounded-sm bg-control-fill">
            {p ? <img src={photoSrc(p)} alt={p.alt} className="size-full object-cover" /> : <Upload className="size-5 text-secondary-text" strokeWidth={1.7} />}
            <span className="absolute bottom-2 left-2 rounded-lg bg-card/90 px-2 py-1 text-[12px] font-medium">{busy === i ? "Uploading…" : p ? "Replace" : "Add photo"}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              setBusy(i);
              try {
                const up = await uploadPhoto(f);
                if (p) set(i, up); else onChange([...photos, { ...up, alt: "" }]);
              } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); } finally { setBusy(null); }
            }} />
          </label>
          {p && <Input placeholder="Describe the photo" value={p.alt} maxLength={200} onChange={(e) => set(i, { alt: e.target.value })} />}
          {p && max > 1 && photos.length > 1 && <button type="button" className="text-[13px] text-destructive" onClick={() => onChange(photos.filter((_, j) => j !== i))}>Remove</button>}
        </div>
      ))}
    </div>
  );
}

function HomepageAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(getHomepageAdmin);
  const loadReels = useServerFn(listAdminReels);
  const save = useServerFn(saveHomepageSection);
  const content = useQuery({ queryKey: ["admin", "homepage"], queryFn: () => load() });
  const reels = useQuery({ queryKey: ["admin", "reels"], queryFn: () => loadReels() });
  const [hero, setHero] = useState<HomeHero>(DEFAULT_HERO);
  const [ex, setEx] = useState<ExampleOfWeek>(DEFAULT_EXAMPLE);
  const [quote, setQuote] = useState<HomeQuote>(DEFAULT_QUOTE);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { if (content.data) { setHero(content.data.hero); setEx(content.data.example); setQuote(content.data.quote); } }, [content.data]);

  const strip = (ps: SitePhoto[]) => ps.map(({ ref, alt }) => ({ ref, alt }));
  async function run(key: "home_hero" | "example_of_week" | "home_quote", value: unknown, msg: string) {
    setSaving(key);
    try {
      await save({ data: { key, value } as never });
      toast.success(msg);
      await qc.invalidateQueries({ queryKey: ["admin", "homepage"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } finally { setSaving(null); }
  }
  const h = (k: keyof HomeHero) => (e: { target: { value: string } }) => setHero({ ...hero, [k]: e.target.value });
  const list = reels.data ?? [];

  if (content.isLoading) return <p className="text-[14px] text-secondary-text">Loading…</p>;
  return (
    <div className="space-y-6">
      <PageTitle title="Homepage" sub="Changes show on the live site as soon as you save." />
      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Home banner</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Announcement"><Input value={hero.announcement} maxLength={120} onChange={h("announcement")} /></Field>
          <Field label="Announcement link text"><Input value={hero.announcementLink} maxLength={60} onChange={h("announcementLink")} /></Field>
          <Field label="Headline, first line"><Input value={hero.line1} maxLength={60} onChange={h("line1")} /></Field>
          <Field label="Headline, second line (blue)"><Input value={hero.line2} maxLength={60} onChange={h("line2")} /></Field>
        </div>
        <Field label="Paragraph"><Textarea value={hero.lede} maxLength={400} rows={3} onChange={h("lede")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Main button"><Input value={hero.primary} maxLength={40} onChange={h("primary")} /></Field>
          <Field label="Second button"><Input value={hero.secondary} maxLength={40} onChange={h("secondary")} /></Field>
        </div>
        <Field label="Line under the buttons"><Input value={hero.note} maxLength={200} onChange={h("note")} /></Field>
        <Field label="Reel in the phone"><ReelPick value={hero.reelId} reels={list} onChange={(reelId) => setHero({ ...hero, reelId })} /></Field>
        <Field label="The three tilted photos"><Photos photos={hero.photos} max={3} onChange={(photos) => setHero({ ...hero, photos })} /></Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving !== null || hero.photos.length !== 3} onClick={() => run("home_hero", { ...hero, photos: strip(hero.photos) }, "Home banner saved")}>{saving === "home_hero" ? "Saving…" : "Save"}</Button>
          <Button variant="outline" disabled={saving !== null} onClick={() => run("home_hero", null, "Home banner reset")}>Reset to default</Button>
        </div>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Example of the week</h2>
        <Field label="Reel"><ReelPick value={ex.reelId} reels={list} onChange={(reelId) => setEx({ ...ex, reelId })} /></Field>
        <Field label="Title"><Input value={ex.title} maxLength={120} onChange={(e) => setEx({ ...ex, title: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={ex.description} maxLength={400} rows={3} onChange={(e) => setEx({ ...ex, description: e.target.value })} /></Field>
        <Field label="Original photos (up to 3)"><Photos photos={ex.photos} max={3} onChange={(photos) => setEx({ ...ex, photos })} /></Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving !== null || !ex.photos.length} onClick={() => run("example_of_week", { ...ex, photos: strip(ex.photos) }, "Example of the week saved")}>{saving === "example_of_week" ? "Saving…" : "Save"}</Button>
          <Button variant="outline" disabled={saving !== null} onClick={() => run("example_of_week", null, "Example of the week reset")}>Reset to default</Button>
        </div>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-[17px] font-semibold">Customer quote</h2>
        <Field label="The quote"><Textarea value={quote.quote} maxLength={400} rows={3} onChange={(e) => setQuote({ ...quote, quote: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={quote.name} maxLength={80} onChange={(e) => setQuote({ ...quote, name: e.target.value })} /></Field>
          <Field label="Role or company"><Input value={quote.role} maxLength={120} onChange={(e) => setQuote({ ...quote, role: e.target.value })} /></Field>
        </div>
        <Field label="Photo or logo">
          <div className="flex items-start gap-3">
            <label className="relative flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm bg-control-fill">
              {quote.photo ? <img src={photoSrc(quote.photo)} alt={quote.photo.alt} className="size-full object-cover" /> : <Upload className="size-5 text-secondary-text" strokeWidth={1.7} />}
              <span className="absolute bottom-1 left-1 rounded-lg bg-card/90 px-1.5 py-0.5 text-[11px] font-medium">{quote.photo ? "Replace" : "Add"}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = "";
                if (!f) return;
                try {
                  const up = await uploadPhoto(f);
                  setQuote({ ...quote, photo: { ...up, alt: quote.photo?.alt ?? "" } });
                } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
              }} />
            </label>
            {quote.photo && (
              <div className="flex-1 space-y-2">
                <Input placeholder="Describe the image" value={quote.photo.alt} maxLength={200} onChange={(e) => setQuote({ ...quote, photo: { ...quote.photo!, alt: e.target.value } })} />
                <button type="button" className="text-[13px] text-destructive" onClick={() => setQuote({ ...quote, photo: null })}>Remove</button>
              </div>
            )}
          </div>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving !== null || !quote.quote.trim()} onClick={() => run("home_quote", { ...quote, photo: quote.photo ? { ref: quote.photo.ref, alt: quote.photo.alt } : null }, "Quote saved")}>{saving === "home_quote" ? "Saving…" : "Save"}</Button>
          <Button variant="outline" disabled={saving !== null} onClick={() => run("home_quote", null, "Quote reset")}>Reset to default</Button>
        </div>
      </Card>
    </div>
  );
}
