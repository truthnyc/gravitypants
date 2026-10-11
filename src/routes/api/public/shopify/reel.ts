import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { handle, json, listTemplates, shopFromRequest } from "@/lib/shopify/session.server";
import { loadReel, replaceReel } from "@/lib/shopify/reel.server";
import { buildReel, itemsFromFrames } from "@/lib/shopify/reel-build";
import type { Template } from "@/lib/stillframe/data";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get"), id: z.string().uuid() }),
  z.object({
    action: z.literal("words"),
    id: z.string().uuid(),
    frames: z.array(z.object({ headline: z.string().max(120), subline: z.string().max(120) })).max(10),
    signoff: z.string().max(60),
  }),
  z.object({ action: z.literal("template"), id: z.string().uuid(), templateId: z.string().uuid() }),
]);

// One endpoint for the reel screen: read, edit words, change template. Always scoped to the token's shop.
export const Route = createFileRoute("/api/public/shopify/reel")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handle(async () => {
          const ctx = await shopFromRequest(request);
          const parsed = Body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Invalid request." }, 400);
          const b = parsed.data;
          const current = await loadReel(ctx.admin, ctx.ws, b.id);
          if (!current) return json({ error: "Reel not found." }, 404);

          if (b.action === "words") {
            for (const [i, f] of current.project.frames.entries()) {
              const w = b.frames[i];
              if (!w) continue;
              const headline = f.headline ? { ...f.headline, text: w.headline } : null;
              const subline = w.subline.trim()
                ? { ...(f.subline ?? { ...(f.headline ?? {}), size_px: Math.round((f.headline?.size_px ?? 96) * 0.55), keep_under_headline: true }), text: w.subline, same_on_all: false }
                : null;
              await ctx.admin.from("frames").update({ headline, subline } as never).eq("id", f.id).eq("project_id", b.id);
            }
            const s = b.signoff.trim();
            await ctx.admin.from("projects").update({ end_card: { enabled: Boolean(s), cta_text: s } } as never).eq("id", b.id).eq("workspace_id", ctx.ws);
          }

          if (b.action === "template") {
            const templates = await listTemplates(ctx.admin);
            const t = templates.find((x) => x.id === b.templateId) as unknown as Template | undefined;
            if (!t) return json({ error: "That template isn't available." }, 404);
            const signoff = current.project.end_card?.cta_text ?? "";
            const next = buildReel(t, itemsFromFrames(current.project.frames), signoff, ctx.ws, current.project.name);
            await replaceReel(ctx.admin, ctx.ws, b.id, next);
          }

          const reel = b.action === "get" ? current : await loadReel(ctx.admin, ctx.ws, b.id);
          const templates = (await listTemplates(ctx.admin)).map((t) => ({ id: t.id, name: t.name, thumbnail_url: t.thumbnail_url }));
          return json({ ...reel, templates });
        }),
    },
  },
});
