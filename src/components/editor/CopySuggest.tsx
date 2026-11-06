import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestFrameCopy } from "@/lib/stillframe/copy-suggest.functions";

type Props = {
  part: "headline" | "subline";
  projectId: string;
  brand: string;
  format: string;
  photoPath: string | null;
  headline?: string;
  current?: string;
  others: string[];
  onPick: (text: string) => void;
};

/** "Suggest" under the headline/subline box: three AI options, click one to use it. Nothing changes until a click. */
export function CopySuggest(p: Props) {
  const run = useServerFn(suggestFrameCopy);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setOpen(true); setBusy(true); setError(null);
    try {
      const res = await run({ data: {
        projectId: p.projectId, part: p.part, brand: p.brand, format: p.format, photoPath: p.photoPath,
        headline: p.headline || undefined, current: p.current || undefined,
        others: p.others.filter(Boolean).slice(0, 20), hint: hint.trim() || undefined,
      } });
      setOptions(res.options);
      if ("error" in res && res.error) setError(res.error);
      else if (!res.options.length) setError("No suggestions this time. Try again.");
    } catch {
      setError("Couldn't write suggestions right now. Please try again.");
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={ask}>
        <Sparkles strokeWidth={1.7} className="size-4" /> Suggest {p.part}
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-[4px] bg-ap-panel p-3">
      <Input value={hint} onChange={(e) => setHint(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void ask(); }} placeholder="Optional direction, like holiday or playful" aria-label="Direction for suggestions" className="h-9 rounded-[4px] text-[13px]" />
      {busy ? (
        <p className="text-[13px] text-secondary-text">Writing options…</p>
      ) : (
        <div className="space-y-1.5">
          {options.map((o) => (
            <button key={o} type="button" onClick={() => p.onPick(o)} className="block w-full rounded-[4px] border border-border bg-background px-3 py-2 text-left text-[14px] text-ap-ink hover:border-link focus-visible:border-link focus-visible:outline-none">
              {o}
            </button>
          ))}
          {error && <p className="text-[12px] text-secondary-text">{error}</p>}
        </div>
      )}
      <div className="flex items-center justify-between">
        <button type="button" disabled={busy} onClick={ask} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-link disabled:opacity-50">
          <RefreshCw strokeWidth={1.7} className="size-3.5" /> More options
        </button>
        <button type="button" onClick={() => { setOpen(false); setOptions([]); }} className="text-[13px] text-secondary-text">Close</button>
      </div>
    </div>
  );
}
