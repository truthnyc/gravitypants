import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { handle, json, shopFromRequest } from "@/lib/shopify/session.server";
import { checkShopPlan } from "@/lib/shopify/app-pricing.server";
import { limitsFor } from "@/lib/shopify/app-pricing";
import { fetchProducts } from "@/lib/shopify/reel.server";
import { addVideoToProducts, reelProductIds } from "@/lib/shopify/product-media.server";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("upgrade"), returnTo: z.string().uuid().optional() }),
  z.object({ action: z.literal("welcome") }),
  z.object({ action: z.literal("start"), id: z.string().uuid(), kind: z.enum(["mp4", "gif"]) }),
  z.object({ action: z.literal("download"), path: z.string().max(300) }),
  z.object({ action: z.literal("products"), id: z.string().uuid() }),
  z.object({ action: z.literal("add-to-products"), id: z.string().uuid(), path: z.string().max(300), productIds: z.array(z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/)).min(1).max(20) }),
]);

// Export allowance uses the same SQL rules as the web app, against the shop's workspace.
export const Route = createFileRoute("/api/public/shopify/export")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handle(async () => {
          const ctx = await shopFromRequest(request);
          const parsed = Body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Invalid request." }, 400);
          const b = parsed.data;

          if (b.action === "status" || b.action === "welcome") {
            const plan = await checkShopPlan(ctx, b.action === "welcome");
            const { data } = await ctx.admin.rpc("export_status", { _ws: ctx.ws });
            let returnTo: string | null = null;
            if (b.action === "welcome") {
              const { data: row } = await ctx.admin.from("shopify_shops").select("upgrade_return_project").eq("shop_domain", ctx.shop).single();
              returnTo = row?.upgrade_return_project ?? null;
              if (returnTo) await ctx.admin.from("shopify_shops").update({ upgrade_return_project: null }).eq("shop_domain", ctx.shop);
            }
            const name = plan.source === "web" ? "your Gravity Pants plan" : limitsFor(plan.plan.handle).name;
            return json({ status: data, plan: { source: plan.source, handle: plan.plan.handle, name, period: plan.plan.period, configured: plan.configured }, returnTo });
          }

          if (b.action === "upgrade") {
            const plan = await checkShopPlan(ctx);
            if (!plan.upgradeUrl) return json({ error: "Billing isn't set up for this app yet. Exports use the free plan until it is." }, 409);
            await ctx.admin.from("shopify_shops").update({ upgrade_return_project: b.returnTo ?? null }).eq("shop_domain", ctx.shop);
            return json({ url: plan.upgradeUrl });
          }

          if (b.action === "start") {
            await checkShopPlan(ctx);
            const { data: p } = await ctx.admin.from("projects").select("id").eq("id", b.id).eq("workspace_id", ctx.ws).maybeSingle();
            if (!p) return json({ error: "Reel not found." }, 404);
            const { data: status } = await ctx.admin.rpc("export_status", { _ws: ctx.ws });
            const st = (status ?? {}) as { allowed?: boolean; watermark?: boolean; reason?: string };
            if (!st.allowed) return json({ error: st.reason === "limit_reached" ? "Your free exports are used up. Choose a plan to keep exporting." : "Exporting isn't available on this store's plan.", reason: st.reason }, 402);
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            const { data: ok } = await ctx.admin.rpc("record_export", { _ws: ctx.ws, _project: b.id, _stamp: stamp });
            if (!ok) return json({ error: "Exporting isn't available right now." }, 402);
            const { data: pf } = await ctx.admin.from("projects").select("primary_format").eq("id", b.id).maybeSingle();
            const name = `reel-${String(pf?.primary_format ?? "9:16").replace(":", "x")}.${b.kind}`;
            const path = `${ctx.ws}/exports/${b.id}/${stamp}/${name}`;
            const { data: up, error } = await ctx.admin.storage.from("media").createSignedUploadUrl(path);
            if (error || !up) return json({ error: "Could not prepare the upload." }, 500);
            return json({ path, uploadUrl: up.signedUrl, watermark: Boolean(st.watermark) });
          }

          if (b.action === "products" || b.action === "add-to-products") {
            const { data: p } = await ctx.admin.from("projects").select("id, name").eq("id", b.id).eq("workspace_id", ctx.ws).maybeSingle();
            if (!p) return json({ error: "Reel not found." }, 404);
            const { data: frames } = await ctx.admin.from("frames").select("photo").eq("project_id", b.id).order("position");
            const ids = reelProductIds((frames ?? []).map((f) => f.photo));
            if (b.action === "products") {
              const products = ids.length ? await fetchProducts(ctx.shop, await ctx.accessToken(), ids) : [];
              return json({ products: products.map((x) => ({ id: x.id, title: x.title })) });
            }
            // Only products already in this reel, and only this reel's own MP4 exports.
            const chosen = b.productIds.filter((x) => ids.includes(x));
            if (!chosen.length) return json({ error: "Choose a product from this reel." }, 400);
            if (!b.path.startsWith(`${ctx.ws}/exports/${b.id}/`) || b.path.includes("..") || !b.path.endsWith(".mp4")) return json({ error: "Only MP4 exports can be added to product pages." }, 400);
            const { data: file, error } = await ctx.admin.storage.from("media").download(b.path);
            if (error || !file) return json({ error: "File not found." }, 404);
            try {
              const r = await addVideoToProducts(ctx.shop, await ctx.accessToken(), file, b.path.split("/").pop()!, chosen, p.name ?? "Product video");
              return json(r);
            } catch (e) {
              const m = (e as Error).message;
              console.error("shopify add-to-products failed", ctx.shop, m);
              if (/access denied|write_products|ACCESS_DENIED/i.test(m)) return json({ error: "This store hasn't allowed Gravity Pants to edit products yet. Reopen the app and approve the updated permissions." }, 403);
              return json({ error: "Shopify couldn't add the video. Please try again." }, 502);
            }
          }

          if (!b.path.startsWith(`${ctx.ws}/exports/`) || b.path.includes("..")) return json({ error: "Not found." }, 404);
          const name = b.path.split("/").pop()!;
          const { data, error } = await ctx.admin.storage.from("media").createSignedUrl(b.path, 300, { download: name });
          if (error || !data) return json({ error: "File not found." }, 404);
          return json({ url: data.signedUrl });
        }),
    },
  },
});
