import { moodLabel } from "@/lib/directory/directory";
import { cn } from "@/lib/utils";

/** One shared mood chip row: pressed chips are filled, unpressed are flat. */
export function MoodChips({ value, options, onChange, disabled }: {
  value: string[];
  options: string[];
  onChange: (moods: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((m) => {
        const on = value.includes(m);
        return (
          <button key={m} type="button" aria-pressed={on} disabled={disabled}
            onClick={() => onChange(on ? value.filter((x) => x !== m) : [...value, m])}
            className={cn("h-9 rounded-lg px-3 text-[14px]", on ? "bg-ap-blue text-ap-card" : "bg-ap-panel text-ap-body hover:bg-ap-media", "disabled:opacity-40")}>
            {moodLabel(m)}
          </button>
        );
      })}
    </div>
  );
}
