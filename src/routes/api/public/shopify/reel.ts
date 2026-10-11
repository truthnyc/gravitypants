import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { handle, json, listTemplates, shopFromRequest } from "@/lib/shopify/session.server";
import { copyImage, fetchProducts, loadReel, replaceReel } from "@/lib/shopify/reel.server";
import { addSlides, buildReel, changeSize, formatPrice, itemsFromFrames, moveSlide, removeSlide, SHOPIFY_SIZES, type ReelItem } from "@/lib/shopify/reel-build";
import { setKitLogo, storeLogo } from "@/lib/shopify/branding.server";
import { MAX_SLIDES } from "@/lib/stillframe/template-doc";
import type { Template } from "@/lib/stillframe/data";
import type { Format, ProjectWithFrames } from "@/lib/stillframe/types";

const id = z.string().uuid();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get"), id }),
  z.object({
    action: z.literal("words"),
    id,
    frames: z.array(z.object({ headline: z.string().max(120), subline: z.string().max(120) })).max(MAX_SLIDES),
    signoff: z.string().max(60),
  }),
  z.object({ action: z.literal("signoff"), id, enabled: z.boolean() }),
  z.object({ action: z.literal("template"), id, templateId: z.string().uuid() }),
  z.object({ action: z.literal("size"), id, format: z.enum(SHOPIFY_SIZES as [Format, ...Format[]]) }),
  z.object({ action: z.literal("remove"), id, index: z.number().int().min(0) }),
  z.object({ action: z.literal("move"), id, from: z.number().int().min(0), to: z.number().int().min(0) }),
  z.object({ action: z.literal("photos"), id }),
  z.object({ action: z.literal("add"), id, productId: z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/).optional(), url: z.string().url().max(1000).optional(), path: z.string().max(300).optional() }),
  z.object({ action: z.literal("upload-url"), id, kind: z.enum(["photo", "logo"]), type: z.enum(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]) }),
  z.object({ action: z.literal("logo"), id, path: z.string().max(300) }),
]);
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/svg+xml": "svg" };

// One endpoint for the reel screen. Always scoped to the token's shop workspace.
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
          const p = current.project;
          const templates = await listTemplates(ctx.admin);
          const uploads = `${ctx.ws}/shopify/uploads/`;

          /** Rebuilds slides with the reel's template, size, logo and sign-off, keeping words. */
          const rebuild = async (items: ReelItem[], templateId?: string) => {
            const t = (templates.find((x) => x.id === (templateId ?? p.template_id)) ?? templates.find((x) => x.is_reusable) ?? templates[0]) as unknown as Template | undefined;
            if (!t) throw new Error("No templates are available right now.");
            const next: ProjectWithFrames = buildReel(t, items, {
              shopName: p.end_card?.cta_text ?? "",
              workspaceId: ctx.ws,
              name: p.name,
              format: p.primary_format,
              logoPath: p.logo?.path ?? null,
              signoff: Boolean(p.end_card?.enabled),
            });
            await replaceReel(ctx.admin, ctx.ws, b.id, next);
          };
          const items = itemsFromFrames(p.frames);
          let notice: string | null = null;

          if (b.action === "words") {
            for (const [i, f] of p.frames.entries()) {
              const w = b.frames[i];
              if (!w) continue;
              const headline = f.headline ? { ...f.headline, text: w.headline } : null;
              const subline = w.subline.trim()
                ? { ...(f.subline ?? { ...(f.headline ?? {}), size_px: Math.round((f.headline?.size_px ?? 96) * 0.55), keep_under_headline: true }), text: w.subline, same_on_all: false }
                : null;
              await ctx.admin.from("frames").update({ headline, subline } as never).eq("id", f.id).eq("project_id", b.id);
            }
            const s = b.signoff.trim();
            await ctx.admin.from("projects").update({ end_card: { ...p.end_card, enabled: Boolean(p.end_card?.enabled) && Boolean(s), cta_text: s } } as never).eq("id", b.id).eq("workspace_id", ctx.ws);
          }
          if (b.action === "signoff") {
            await ctx.admin.from("projects").update({ end_card: { ...p.end_card, enabled: b.enabled, background: "last_photo" } } as never).eq("id", b.id).eq("workspace_id", ctx.ws);
          }
          if (b.action === "template") {
            if (!templates.some((x) => x.id === b.templateId)) return json({ error: "That template isn't available." }, 404);
            await rebuild(items, b.templateId);
          }
          if (b.action === "size") await replaceReel(ctx.admin, ctx.ws, b.id, changeSize(p, b.format));
          if (b.action === "remove" || b.action === "move") {
            const r = b.action === "remove" ? removeSlide(items, b.index) : moveSlide(items, b.from, b.to);
            if (r.error) return json({ error: r.error }, 422);
            await rebuild(r.items);
          }
          if (b.action === "photos") {
            const ids = [...new Set(items.map((i) => i.productId).filter((x): x is string => !!x))];
            const products = ids.length ? await fetchProducts(ctx.shop, await ctx.accessToken(), ids) : [];
            return json({ products: products.map((x) => ({ id: x.id, title: x.title, images: x.images.map((i) => i.url) })) });
          }
          if (b.action === "add") {
            if (items.length >= MAX_SLIDES) return json({ error: addSlides(items, [{ path: "", headline: "", subline: null }]).error }, 422);
            let item: ReelItem | null = null;
            if (b.path) {
              if (!b.path.startsWith(uploads) || b.path.includes("..") || !/\.(jpg|png|webp)$/.test(b.path)) return json({ error: "Not found." }, 404);
              item = { path: b.path, headline: "", subline: null };
            } else if (b.productId && b.url && items.some((i) => i.productId === b.productId)) {
              const [prod] = await fetchProducts(ctx.shop, await ctx.accessToken(), [b.productId]);
              if (!prod || !prod.images.some((i) => i.url === b.url)) return json({ error: "That photo isn't on this product." }, 404);
              const path = await copyImage(ctx.admin, ctx.ws, `add-${Date.now()}`, items.length, b.url);
              if (!path) return json({ error: "We couldn't copy that photo. Please try another." }, 502);
              item = { path, headline: prod.title, subline: formatPrice(prod.price), productId: prod.id };
            }
            if (!item) return json({ error: "Choose a photo." }, 400);
            const r = addSlides(items, [item]);
            if (r.error) return json({ error: r.error }, 422);
            await rebuild(r.items);
          }
          if (b.action === "upload-url") {
            if (b.kind === "photo" && b.type === "image/svg+xml") return json({ error: "Use a JPG, PNG or WebP photo." }, 400);
            const path = `${uploads}${b.kind}-${crypto.randomUUID()}.${EXT[b.type]}`;
            const { data, error } = await ctx.admin.storage.from("media").createSignedUploadUrl(path);
            if (error || !data) return json({ error: "Could not prepare the upload." }, 500);
            return json({ path, uploadUrl: data.signedUrl });
          }
          if (b.action === "logo") {
            if (!b.path.startsWith(`${uploads}logo-`) || b.path.includes("..")) return json({ error: "Not found." }, 404);
            const { data: file } = await ctx.admin.storage.from("media").download(b.path);
            if (!file) return json({ error: "Upload not found." }, 404);
            let key: string;
            try {
              key = await storeLogo(ctx.admin, ctx.ws, await file.arrayBuffer(), file.type || (b.path.endsWith(".svg") ? "image/svg+xml" : "image/png"));
            } catch (e) {
              return json({ error: (e as Error).message }, 422);
            } finally {
              await ctx.admin.storage.from("media").remove([b.path]);
            }
            await setKitLogo(ctx.admin, ctx.ws, key);
            await ctx.admin.from("projects").update({ logo: { ...p.logo, path: key, light_path: null, dark_path: null } } as never).eq("id", b.id).eq("workspace_id", ctx.ws);
            notice = "Logo saved. Your next reels will use it too.";
          }

          const reel = b.action === "get" ? current : await loadReel(ctx.admin, ctx.ws, b.id);
          return json({ ...reel, notice, maxSlides: MAX_SLIDES, templates: templates.map((t) => ({ id: t.id, name: t.name, thumbnail_url: t.thumbnail_url })) });
        }),
    },
  },
});
