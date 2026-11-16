import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppButton, AppInput } from "@/components/app-ui";
import { useCreateAdFromDraft, useTemplates } from "@/lib/stillframe/data";
import { getMediaUrl } from "@/lib/stillframe/media";
import { openUpgrade, usePlanAccess } from "@/lib/stillframe/plan";
import type { Format } from "@/lib/stillframe/types";
import { draftFromProductUrl } from "@/lib/stillframe/url-reel.functions";
import type { ReelDraft } from "@/lib/stillframe/url-reel";
import { getWorkspaceId } from "@/lib/stillframe/workspace";

type Photo = { assetId: string; path: string; width: number; height: number; name: string };
type Result = { product: { name: string }; photos: Photo[]; drafts: ReelDraft[] };

function Thumb({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let on = true; void getMediaUrl(path).then((u) => on && setSrc(u)); return () => { on = false; }; }, [path]);
  return <div className="aspect-square w-14 shrink-0 overflow-hidden rounded-[4px] bg-ap-inner">{src && <img src={src} alt="" className="h-full w-full object-cover" />}</div>;
}

/** New ad screen: paste a product link, get three drafts (each its own template, with the chosen brand kit), pick one. */
export function FromLink({ format, kitId }: { format: Format; kitId: string | null }) {
  const run = useServerFn(draftFromProductUrl);
  const navigate = useNavigate();
  const create = useCreateAdFromDraft();
  const { data: templates } = useTemplates();
  const locked = !usePlanAccess().canUse("ai_copy");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(Result & { format: Format }) | null>(null);

  const go = async () => {
    if (locked) { openUpgrade("ai_copy"); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await run({ data: { workspaceId: getWorkspaceId(), url: url.trim(), format } });
      if (!res.ok) {
        if ("locked" in res && res.locked) openUpgrade("ai_copy");
        setError(res.error);
      } else setResult({ ...res, format });
    } catch {
      setError("That link didn't work. Check it starts with https:// and try again.");
    } finally { setBusy(false); }
  };

  const use = async (d: ReelDraft) => {
    const template = templates?.find((t) => t.id === d.templateId);
    if (!template || !result) { toast.error("That template isn't available any more."); return; }
    try {
      const id = await create.mutateAsync({
        template, format: result.format, kitId, name: result.product.name,
        slides: d.slides.map((s) => ({ photo: { ...result.photos[s.photo]!, url: null }, headline: s.headline, subline: s.subline })),
      });
      navigate({ to: "/app/ad/$id/edit", params: { id } });
    } catch { toast.error("Couldn't start your ad. Try again."); }
  };

  return (
    <section className="mb-6 rounded-[4px] bg-ap-panel p-4" aria-label="Create from a product link">
      <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-ap-ink">
        <Link2 strokeWidth={1.7} className="size-4" /> Create from a product link
        {locked && <span className="text-[12px] font-normal text-ap-muted">· Paid plans</span>}
      </div>
      <p className="mb-3 text-[13px] text-ap-body">Paste a product page. You'll get three drafts to choose from.</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) void go(); }}>
        <AppInput type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourshop.com/products/…" aria-label="Product page link" className="min-w-0 flex-1" />
        <AppButton type="submit" size="sm" className="h-10" disabled={busy || (!locked && !url.trim())}>
          <Sparkles strokeWidth={1.7} className="size-4" />{busy ? "Working…" : "Make drafts"}
        </AppButton>
      </form>
      {busy && <p className="mt-3 text-[13px] text-ap-muted">Reading the page and writing three drafts…</p>}
      {error && <p role="alert" className="mt-3 text-[13px] text-destructive">{error}</p>}
      {result && (
        <ul className="mt-4 space-y-3">
          {result.drafts.map((d, i) => (
            <li key={d.templateId} className="rounded-[4px] bg-ap-card p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-ap-ink">Draft <span className="tabular-nums">{i + 1}</span> · {d.templateName}</span>
                <span className="text-[12px] text-ap-muted">{d.angle}</span>
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
              <AppButton size="sm" variant="ghost" className="mt-3 w-full" disabled={create.isPending} onClick={() => void use(d)}>Use this draft</AppButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
