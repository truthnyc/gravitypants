import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily cleanup (called by pg_cron): deletes export folders older than 30 days,
 * per workspace (<workspace_id>/exports/<project>/<stamp>/…).
 * Only ever removes expired files, so it is safe to call without a caller secret.
 */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const BUCKET = "media";

function stampDate(stamp: string) {
  const d = new Date(stamp.replace(/T(\d\d)-(\d\d)-(\d\d)-(\d+)Z/, "T$1:$2:$3.$4Z"));
  return isNaN(d.getTime()) ? null : d;
}

export const Route = createFileRoute("/api/public/cleanup-exports")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const store = supabaseAdmin.storage.from(BUCKET);
        const cutoff = Date.now() - KEEP_MS;
        let removed = 0;
        const { data: roots } = await store.list("", { limit: 1000 });
        const prefixes = ["exports", ...(roots ?? []).filter((r) => !r.id && r.name !== "exports").map((r) => `${r.name}/exports`)];
        for (const root of prefixes) {
          const { data: projects } = await store.list(root, { limit: 1000 });
          for (const p of projects ?? []) {
            if (p.id) continue;
            const { data: stamps } = await store.list(`${root}/${p.name}`, { limit: 1000 });
            for (const s of stamps ?? []) {
              if (s.id) continue;
              const d = stampDate(s.name);
              if (!d || d.getTime() > cutoff) continue;
              const dir = `${root}/${p.name}/${s.name}`;
              const { data: files } = await store.list(dir, { limit: 1000 });
              const paths = (files ?? []).filter((f) => f.id).map((f) => `${dir}/${f.name}`);
              if (paths.length) {
                const { error } = await store.remove(paths);
                if (!error) removed += paths.length;
              }
            }
          }
        }
        return Response.json({ removed });
      },
    },
  },
});
