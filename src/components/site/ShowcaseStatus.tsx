import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showcaseReelStatus } from "@/lib/site/reel-status.functions";

const LABEL = { saved: "Video saved", pending: "Pending", failed: "Failed" } as const;
const TONE = { saved: "bg-success-text", pending: "bg-warning-text", failed: "bg-destructive" } as const;

/** Staff-only panel on Showcase; visitors never see it or trigger the request. */
export function ShowcaseStatus() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null)); }, []);
  const load = useServerFn(showcaseReelStatus);
  const { data } = useQuery({ queryKey: ["showcase-status", uid], enabled: !!uid, retry: false, queryFn: () => load().catch(() => null) });
  if (!data?.length) return null;
  return (
    <section className="examples-container" aria-label="Reel video status">
      <div className="site-card p-5">
        <h2 className="text-base font-semibold">Reel video status</h2>
        <p className="text-sm text-muted-foreground">Only staff see this. Pending and failed reels are hidden from visitors.</p>
        <ul className="mt-3 divide-y divide-border">
          {data.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="min-w-0 truncate"><strong>{r.brand}</strong> · {r.title}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${TONE[r.status]}`} aria-hidden="true" />
                {LABEL[r.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
