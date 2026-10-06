import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

/** Shared destination and treatment for Directory reel brand touch points. */
export function BrandLink({ name, slug, logo, tile = false, hidden = false }: {
  name: string; slug: string; logo?: string | null; tile?: boolean; hidden?: boolean;
}) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).map((word) => word.charAt(0)).slice(0, 2).join("").toUpperCase();
  return (
    <Link to="/directory/$slug" params={{ slug }} tabIndex={hidden ? -1 : undefined}
      aria-label={tile ? `More from ${name}` : undefined}
      className={tile ? "dir-brand-tile" : "dir-brand-name"}>
      {tile ? <>
        <span className="dir-brand-logo" aria-hidden="true">
          {logo && failedLogo !== logo
            ? <img src={logo} alt="" loading="lazy" onError={() => setFailedLogo(logo)} />
            : initials}
        </span>
        <span className="dir-brand-detail">
          <span className="dir-brand-title">{name}</span>
          <ArrowRight className="dir-brand-arrow" size={14} strokeWidth={1.7} aria-hidden="true" />
        </span>
      </> : name}
    </Link>
  );
}