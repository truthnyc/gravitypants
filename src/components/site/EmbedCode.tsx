import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppButton } from "@/components/app-ui";
import { EMBED_SIZES, embedCode, embedSize, embedUrl, type EmbedTarget } from "@/lib/site/embed";
import { cn } from "@/lib/utils";

/** The reel's own page, so a client can check it before pasting the code. */
export function EmbedPreviewLink({ reel }: { reel: EmbedTarget }) {
  return (
    <a href={embedUrl(reel.id)} target="_blank" rel="noopener noreferrer" data-cta="embed-preview" className="inline-flex items-center gap-1 text-[14px] text-ap-blue">
      Preview reel <ArrowUpRight className="size-3.5" strokeWidth={1.7} />
    </a>
  );
}

async function toClipboard(text: string, fallback: HTMLTextAreaElement | null) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Embed code copied. Paste it into your website's HTML.");
    return;
  } catch {
    // Browsers refuse the clipboard outside a secure context; the code is still on screen.
    fallback?.select();
    toast.error("Select the code and press Ctrl or Cmd + C to copy it.");
  }
}

/** Full dialog: pick a size, then copy the line to paste into a website. */
export function EmbedDialog({ reel, open, onClose }: { reel: EmbedTarget | null; open: boolean; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLTextAreaElement>(null);
  if (!reel) return null;
  const code = embedCode(reel.id, embedSize(reel.format, scale), reel.title);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Embed this reel</DialogTitle>
          <DialogDescription>Paste this into your website's HTML to show the reel there.</DialogDescription>
        </DialogHeader>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Embed size">
          {EMBED_SIZES.map((s) => {
            const d = embedSize(reel.format, s.scale);
            return (
              <button key={s.label} type="button" aria-pressed={s.scale === scale} onClick={() => setScale(s.scale)}
                className={cn("h-9 nums rounded-lg px-3 text-[14px]", s.scale === scale ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-body hover:bg-ap-media")}>
                {s.label} {d.w}×{d.h}
              </button>
            );
          })}
        </div>
        <label htmlFor="embed-code" className="mt-4 block text-[13px] font-semibold">Embed code</label>
        <textarea id="embed-code" ref={box} readOnly value={code} rows={4} onFocus={(e) => e.currentTarget.select()}
          className="mt-1.5 w-full resize-y rounded-[4px] bg-ap-panel px-3 py-2.5 font-mono text-[12px] leading-[1.5] outline-hidden focus:ring-2 focus:ring-ap-blue" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <EmbedPreviewLink reel={reel} />
          <AppButton size="sm" onClick={() => void toClipboard(code, box.current)}>Copy code</AppButton>
        </div>
        <p className="text-[12px] text-ap-muted">Change the width and height to fit your page — the reel keeps its own shape.</p>
      </DialogContent>
    </Dialog>
  );
}
