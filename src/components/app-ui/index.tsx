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
  size?: "sm" | "md" | "lg";
};
export const AppButton = React.forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = "primary", size = "md", className, ...p }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 font-ap text-[15px] font-medium transition-colors outline-hidden focus-visible:shadow-ap-focus disabled:opacity-50",
        size === "sm" ? "h-9 px-3.5 text-[14px]" : size === "md" ? "h-10" : "h-[46px] px-5",
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
    <div className={cn("flex flex-col gap-[7px] font-ap", className)}>
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
    <div role="radiogroup" className={cn("inline-flex gap-[3px] rounded-[10px] bg-ap-panel p-[3px] font-ap", className)}>
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
              "rounded-[7px] px-[11px] py-[5px] text-[13px] transition-colors outline-hidden focus-visible:shadow-ap-focus",
              on ? "bg-ap-card font-semibold text-ap-ink shadow-ap-soft" : "text-ap-ink",
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
    <nav aria-label="Steps" className={cn("inline-flex items-center gap-[3px] rounded-[10px] bg-ap-panel p-[3px] font-ap", className)}>
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
              "flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] tabular-nums",
              now ? "bg-ap-card font-semibold text-ap-ink shadow-ap-soft" : "text-ap-muted",
              onSelect && !now && "hover:text-ap-ink",
            )}
          >
            <span
              className={cn(
                "grid size-[18px] place-items-center rounded-full text-[11px] font-semibold",
                done ? "bg-ap-green text-ap-card" : now ? "bg-ap-blue text-ap-card" : "bg-ap-media text-ap-muted",
              )}
            >
              {done ? <Check size={11} strokeWidth={2.5} /> : i + 1}
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
        "relative h-8 w-[52px] shrink-0 rounded-full transition-colors outline-hidden focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ap-blue/40",
        checked ? "bg-ap-blue" : "bg-ap-switch-off",
        className,
      )}
      {...p}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-7 rounded-full bg-ap-card shadow-ap-knob transition-transform", checked && "translate-x-5")} />
    </button>
  );
}

/* AppSectionLabel: 12-13px semibold uppercase, 0.06em tracking, body color. */
export function AppSectionLabel({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-ap text-[12px] font-semibold tracking-[0.06em] text-ap-body uppercase sm:text-[13px]", className)} {...p} />;
}

/* AppInfoBox: soft-blue bg, 18px radius. */
export function AppInfoBox({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[18px] bg-ap-soft-blue p-5 font-ap text-[14px] leading-normal text-ap-body", className)} {...p} />;
}

/* AppThumb: 8px radius, 1px inner ring + soft shadow. */
export function AppThumb({ className, ...p }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={cn("rounded-lg bg-ap-media object-cover shadow-ap-thumb ring-1 ring-ap-inner", className)} {...p} />;
}

/* AppTag: plain blue text, or white chip with hairline border. Never tinted. */
export function AppTag({ chip = false, selected = false, className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { chip?: boolean; selected?: boolean }) {
  return (
    <span
      className={cn(
        "font-ap text-[13px] font-medium text-ap-blue",
        chip && "inline-flex items-center rounded-lg border border-ap-hairline bg-ap-card px-[13px] py-[7px] text-[14px] font-normal text-ap-ink",
        chip && selected && "border-ap-blue font-semibold text-ap-blue",
        className,
      )}
      {...p}
    />
  );
}
