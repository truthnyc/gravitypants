import type { ReactNode } from "react";

export type ReelFrame = { background: string; artwork: ReactNode };

export function ReelPhone({ frames, headline, subline, logoBadge, size = "medium", layout, logo }: {
  frames: ReelFrame[];
  headline: string;
  subline: string;
  logoBadge?: ReactNode;
  size?: "small" | "medium" | "large";
  // "top" matches the Purl Soho ad: light centered headline at the top, logo line near the bottom.
  layout?: "top";
  logo?: ReactNode;
}) {
  const shown = frames.slice(0, 3);
  return <div className={`site-phone site-phone-${size}${layout === "top" ? " site-phone-top" : ""}`} aria-label={`${headline}. ${subline}`}>
    <div className="site-phone-screen">
      <div className="site-phone-bars" aria-hidden="true">{shown.map((_, i) => <span key={i}><i className={`site-fill-${i + 1}`} /></span>)}</div>
      {logoBadge && <div className="site-phone-brand">{logoBadge}</div>}
      {shown.map((frame, i) => <div key={i} className={`site-phone-frame site-frame-${i + 1}`} style={{ background: frame.background }} aria-hidden="true"><div className="site-phone-art">{frame.artwork}</div></div>)}
      <div className="site-phone-copy"><b>{headline}</b><span>{subline}</span></div>
      {logo && <div className="site-phone-logo" aria-hidden="true">{logo}</div>}
    </div>
  </div>;
}