import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { makeOneLikeThis, reportReel } from "@/lib/directory/directory.functions";
import { ratio, type DirectoryCard } from "@/lib/directory/directory";
import { ReelVideo } from "@/components/site/ReelVideo";
import { ReelCarousel } from "@/components/site/ReelCarousel";
import { LikeSave } from "./LikeSave";

const shape = (f: string | undefined) => (f === "9x16" ? "aspect-[9/16] h-full" : f === "16x9" ? "aspect-[16/9] w-full" : "aspect-square h-full");

/** The reel's poster shown whole, at its own shape. */
export function ReelPoster({ card, className = "" }: { card: DirectoryCard; className?: string }) {
  return (
    <div className={`grid place-items-center bg-ap-panel p-[10%] ${className}`}>
      {card.poster
        ? <img src={card.poster} alt={`${card.brand_name} reel`} loading="lazy" className={`max-h-full max-w-full rounded-lg object-contain shadow-ap-soft ${shape(card.formats[0])}`} />
        : <div className={`rounded-lg bg-ap-media ${shape(card.formats[0])}`} />}
    </div>
  );
}

/** The reel centred on its own shape, like the /showcase cards; plays the video once in view. */
function ReelThumb({ card }: { card: DirectoryCard }) {
  const shapeClass = card.formats[0] === "9x16" ? "dir-reel-916" : card.formats[0] === "16x9" ? "dir-reel-169" : "dir-reel-11";
  return (
    <div className={`dir-reel ${shapeClass}`}>
      {card.video ? (
        <ReelVideo noFullscreen video={card.video} poster={card.poster ?? undefined} label={`${card.brand_name} reel`} className="dir-reel-media" />
      ) : card.poster ? (
        <img src={card.poster} alt={`${card.brand_name} reel`} loading="lazy" />
      ) : null}
    </div>
  );
}

function matched(card: DirectoryCard, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const all = [...card.moods, ...card.tags];
  const hits = words.length ? all.filter((t) => words.some((w) => t.includes(w) || w.includes(t))) : [];
  return (hits.length ? hits : all).slice(0, 4);
}

export function DirectoryGrid({ cards, q = "", onOpen }: { cards: DirectoryCard[]; q?: string; onOpen: (c: DirectoryCard) => void }) {
  return (
    <div className="grid gap-5 font-ap [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
      {cards.map((c) => (
        <article key={c.reel_id} className="dir-card min-w-0">
          <button type="button" onClick={() => onOpen(c)} className="dir-card-media block w-full focus-visible:outline-2 focus-visible:outline-ap-blue" aria-label={`Open ${c.brand_name} reel`}>
            <ReelThumb card={c} />
          </button>
          <div className="mt-3 truncate font-semibold">
            <Link to="/directory/$slug" params={{ slug: c.brand_slug }} className="hover:text-ap-blue">{c.brand_name}</Link>
          </div>
          <div className="truncate text-[13px] text-ap-muted nums">
            {c.title ?? c.template_name ?? "Custom reel"} · {c.seconds} sec
          </div>
          <div className="mt-0.5 text-[12px] text-ap-badge">{matched(c, q).join(" · ")}</div>
        </article>
      ))}
    </div>
  );
}

export function CardCarousel({ cards, label, onOpen }: { cards: DirectoryCard[]; label: string; onOpen: (c: DirectoryCard) => void }) {
  return (
    <ReelCarousel
      label={label}
      items={cards.map((c) => ({
        key: c.reel_id,
        media: (hidden) => (
          <button type="button" tabIndex={hidden ? -1 : undefined} onClick={() => onOpen(c)} className="dir-card-media block w-full" aria-label={`Open ${c.brand_name} reel`}>
            <ReelThumb card={c} />
          </button>
        ),
        title: c.brand_name,
        detail: `${c.title ?? c.template_name ?? "Custom reel"} · ${c.seconds} sec`,
        visit: c.website_url ? { href: c.website_url, label: `Visit ${c.brand_name}` } : undefined,
      }))}
    />
  );
}

/** Reel detail: pop-up on desktop, bottom sheet on phones. */
export function ReelDetail({ card, onClose }: { card: DirectoryCard | null; onClose: () => void }) {
  const mobile = useIsMobile();
  if (!card) return null;
  const body = <DetailBody card={card} onClose={onClose} />;
  return mobile ? (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92dvh] overflow-y-auto px-5 pb-8 font-ap"><DrawerTitle className="sr-only">{card.brand_name} reel</DrawerTitle>{body}</DrawerContent>
    </Drawer>
  ) : (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[860px] gap-0 overflow-hidden rounded-[24px] p-0 font-ap"><DialogTitle className="sr-only">{card.brand_name} reel</DialogTitle>{body}</DialogContent>
    </Dialog>
  );
}

function DetailBody({ card, onClose }: { card: DirectoryCard; onClose: () => void }) {
  const navigate = useNavigate();
  const make = useServerFn(makeOneLikeThis);
  const report = useServerFn(reportReel);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const tname = card.template_name ?? "this";

  const start = async () => {
    if (!card.template_id) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const target = `/app/templates?template=${card.template_id}`;
        void navigate({ to: "/signup", search: { redirect: target, template: card.template_id } });
        return;
      }
      const t = await make({ data: { reelId: card.reel_id, templateId: card.template_id } });
      toast.success(`Started from the ${t.name} template.`);
      if (t.slug) void navigate({ to: "/app/templates/$slug", params: { slug: t.slug } });
      else void navigate({ to: "/app/templates", search: { template: t.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid text-ap-ink sm:grid-cols-[1fr_1fr]">
      {card.video ? (
        <div className="grid aspect-square place-items-center bg-ap-panel p-[10%] sm:aspect-auto sm:min-h-[460px]">
          <video src={card.video} poster={card.poster ?? undefined} controls autoPlay loop muted playsInline className={`max-h-full max-w-full rounded-lg object-contain shadow-ap-soft ${shape(card.formats[0])}`} />
        </div>
      ) : (
        <ReelPoster card={card} className="aspect-square sm:aspect-auto sm:min-h-[460px]" />
      )}
      <div className="flex flex-col gap-3 p-6 sm:p-8">
        <p className="text-[14px] font-semibold text-ap-badge">{card.category}</p>
        <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">{card.title ?? card.template_name ?? "Custom reel"}</h2>
        <p className="text-[15px]">by <Link to="/directory/$slug" params={{ slug: card.brand_slug }} onClick={onClose} className="font-semibold hover:text-ap-blue">{card.brand_name}</Link></p>
        <div className="flex gap-2"><LikeSave kind="reel" id={card.reel_id} name={card.title ?? `${card.brand_name} reel`} /></div>
        {card.website_url && <a href={card.website_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1 text-[14px] text-ap-blue">Visit {card.brand_name} <ArrowUpRight className="size-3.5" strokeWidth={1.7} /></a>}
        {card.description && <p className="text-[15px] leading-normal text-ap-body">{card.description}</p>}
        <div className="flex flex-wrap gap-1.5 text-[13px] nums">
          {[`${card.photos} photos`, `${card.seconds} sec`, ...card.formats.map(ratio)].map((c) => <span key={c} className="rounded-lg bg-ap-panel px-2.5 py-1">{c}</span>)}
        </div>
        {(card.tags.length > 0 || card.moods.length > 0) && (
          <div>
            <p className="mb-1.5 text-[12px] font-semibold tracking-[0.06em] text-ap-body uppercase">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {[...card.moods, ...card.tags].map((t) => (
                <Link key={t} to="/directory" search={{ q: t }} onClick={onClose} className="rounded-lg border border-ap-hairline bg-ap-card px-2.5 py-1 text-[13px] hover:border-ap-blue">{t}</Link>
              ))}
            </div>
          </div>
        )}
        {card.template_id && (
          <div className="mt-2 rounded-[14px] bg-ap-panel p-4 text-[14px] leading-normal">
            <p>Make one like this starts with: <b>{tname} template</b></p>
            <p className="mt-1 text-ap-body">You add your own photos, words, colors and fonts, or use your brand kit.</p>
          </div>
        )}
        <button type="button" disabled={!card.template_id || busy} onClick={() => void start()} className="mt-1 h-12 rounded-lg bg-ap-blue text-[16px] font-semibold text-ap-card disabled:opacity-40">
          {busy ? "Starting…" : "Make one like this"}
        </button>
        {reporting ? (
          <form className="flex gap-2" onSubmit={async (e) => {
            e.preventDefault();
            try { await report({ data: { reelId: card.reel_id, reason } }); toast("Thanks. We'll take a look."); setReporting(false); }
            catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't send that."); }
          }}>
            <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="What's wrong with this reel?" className="h-9 flex-1 rounded-lg border border-ap-hairline px-2.5 text-[14px]" />
            <button type="submit" disabled={!reason.trim()} className="text-[14px] text-ap-blue disabled:opacity-40">Send</button>
          </form>
        ) : (
          <button type="button" onClick={() => setReporting(true)} className="w-fit text-[12px] text-ap-muted underline-offset-2 hover:underline">Report</button>
        )}
      </div>
    </div>
  );
}
