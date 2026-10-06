import { Link } from "@tanstack/react-router";
import { useState } from "react";

/** Shared destination and treatment for Directory reel brand touch points. */
export function BrandLink({ name, slug, hidden = false }: {
  name: string; slug: string; hidden?: boolean;
}) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  void failedLogo;
  void setFailedLogo;
  return (
    <Link to="/directory/$slug" params={{ slug }} tabIndex={hidden ? -1 : undefined}
      className="dir-brand-name">
      {name}
    </Link>
  );
}
