import { moodLabel } from "@/lib/directory/directory";
import { useMoodCatalog } from "@/lib/directory/moods";
import { REEL_MOODS_MAX, TAG_KINDS, TAG_KIND_LABEL, splitByKind, type TagKind } from "@/lib/directory/tag-kinds";
import { cn } from "@/lib/utils";

/**
 * One picker for all four tag types, in the shared order Mood · Occasion · Season · Setting.
 * `moodOptions` narrows the Mood row (e.g. a category's list); `capMoods` limits Mood picks per reel.
 */
export function TagPicker({ value, onChange, moodOptions, capMoods = false, disabled }: {
  value: string[];
  onChange: (tags: string[]) => void;
  moodOptions?: string[];
  capMoods?: boolean;
  disabled?: boolean;
}) {
  const cat = useMoodCatalog();
  const split = splitByKind(value, cat.kindOf);
  const optionsFor = (k: TagKind) => {
    const base = k === "mood" ? (moodOptions ?? cat.all).filter((m) => cat.kindOf(m) === "mood") : cat.kinds[k];
    return [...new Set([...base, ...split[k]])];
  };
  return (
    <div className="grid gap-2">
      {TAG_KINDS.map((k) => {
        const picked = split[k];
        const full = k === "mood" && capMoods && picked.length >= REEL_MOODS_MAX;
        return (
          <div key={k} role="group" aria-label={TAG_KIND_LABEL[k]} className="grid gap-1.5 sm:grid-cols-[96px_1fr] sm:items-start">
            <span className="pt-1.5 text-[12px] font-semibold text-ap-muted">
              {TAG_KIND_LABEL[k]}
              {k === "mood" && capMoods && <span className="ml-1 font-normal nums">{picked.length} / {REEL_MOODS_MAX}</span>}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {optionsFor(k).map((m) => {
                const on = value.includes(m);
                return (
                  <button key={m} type="button" aria-pressed={on} disabled={disabled || (!on && full)}
                    onClick={() => onChange(on ? value.filter((x) => x !== m) : [...value, m])}
                    className={cn("h-8 rounded-lg px-3 text-[13px]", on ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-body hover:bg-ap-media", "disabled:cursor-not-allowed disabled:opacity-40")}>
                    {moodLabel(m)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
