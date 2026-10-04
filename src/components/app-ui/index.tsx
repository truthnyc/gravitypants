import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* AppCard: white, 24px radius, 24px padding, no border. */
export function AppCard({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[24px] bg-ap-card p-[22px] font-ap text-ap-ink sm:p-[26px]", className)} {...p} />;
}

/* AppButton: 8px radius, primary (blue) or ghost (panel), 40px or 46px. */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
};
export const AppButton = React.forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = "primary", size = "md", className, ...p }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 font-ap text-[15px] font-medium transition-colors outline-hidden focus-visible:shadow-ap-focus disabled:opacity-50",
        size === "md" ? "h-10" : "h-[46px] px-5",
        variant === "primary"
          ? "bg-ap-blue text-ap-card hover:bg-ap-blue-hover"
          : "bg-ap-panel text-ap-ink hover:bg-ap-inner",
        className,
      )}
      {...p}
    />
  ),
);
AppButton.displayName = "AppButton";

/* AppField: 13px semibold label above an input/select. */
export function AppField({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5 font-ap", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ap-ink">{label}</label>
      {children}
    </div>
  );
}

const fieldCls =
  "h-11 w-full rounded-[12px] border border-ap-hairline bg-ap-card px-3.5 font-ap text-[15px] text-ap-ink outline-hidden placeholder:text-ap-muted focus:border-ap-blue focus:shadow-ap-focus";

export const AppInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(fieldCls, className)} {...p} />,
);
AppInput.displayName = "AppInput";

export const AppSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => <select ref={ref} className={cn(fieldCls, "appearance-none pr-9", className)} {...p} />,
);
AppSelect.displayName = "AppSelect";

/* AppSegmented: panel bg, 10px radius, 4px padding; selected is white with soft shadow. */
export function AppSegmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-[10px] bg-ap-panel p-1 font-ap", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 rounded-[7px] px-3 text-[13px] font-medium transition-colors outline-hidden focus-visible:shadow-ap-focus",
              on ? "bg-ap-card text-ap-ink shadow-ap-soft" : "text-ap-body hover:text-ap-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* AppSteps: top bar step control. Photos · Edit · Export · Share. */
export const AD_STEPS = ["Photos", "Edit", "Export", "Share"] as const;
export function AppSteps({ current, steps = AD_STEPS as unknown as string[], onSelect, className }: {
  current: number;
  steps?: string[];
  onSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Steps" className={cn("inline-flex items-center rounded-[10px] bg-ap-panel p-1 font-ap", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <button
            key={s}
            type="button"
            aria-current={now ? "step" : undefined}
            onClick={() => onSelect?.(i)}
            disabled={!onSelect}
            className={cn(
              "flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium tabular-nums",
              now ? "bg-ap-card text-ap-ink shadow-ap-soft" : "text-ap-body",
              onSelect && !now && "hover:text-ap-ink",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[11px] font-semibold",
                done ? "bg-ap-green text-ap-card" : now ? "bg-ap-blue text-ap-card" : "bg-ap-inner text-ap-body",
              )}
            >
              {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
            </span>
            {s}
          </button>
        );
      })}
    </nav>
  );
}

/* AppSwitch: 52x32, blue when on. */
export function AppSwitch({ checked, onCheckedChange, className, ...p }: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-8 w-[52px] shrink-0 rounded-full transition-colors outline-hidden focus-visible:shadow-ap-focus",
        checked ? "bg-ap-blue" : "bg-ap-inner",
        className,
      )}
      {...p}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-7 rounded-full bg-ap-card shadow-ap-soft transition-transform", checked && "translate-x-5")} />
    </button>
  );
}

/* AppSectionLabel: 12-13px semibold uppercase, 0.06em tracking, body color. */
export function AppSectionLabel({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-ap text-[12px] font-semibold tracking-[0.06em] text-ap-body uppercase sm:text-[13px]", className)} {...p} />;
}

/* AppInfoBox: soft-blue bg, 18px radius. */
export function AppInfoBox({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[18px] bg-ap-soft-blue p-5 font-ap text-ap-ink", className)} {...p} />;
}

/* AppThumb: 8px radius, 1px inner ring + soft shadow. */
export function AppThumb({ className, ...p }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={cn("rounded-lg bg-ap-media object-cover shadow-ap-thumb ring-1 ring-ap-inner ring-inset", className)} {...p} />;
}

/* AppTag: plain blue text, or white chip with hairline border. Never tinted. */
export function AppTag({ chip = false, className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { chip?: boolean }) {
  return (
    <span
      className={cn(
        "font-ap text-[13px] font-medium text-ap-blue",
        chip && "inline-flex h-7 items-center rounded-lg border border-ap-hairline bg-ap-card px-2.5 text-ap-ink",
        className,
      )}
      {...p}
    />
  );
}
