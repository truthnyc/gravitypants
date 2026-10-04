import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_POPUP, type NewsletterPopupContent } from "./newsletter";
import { REEL_PREFIX } from "./reels";

const schema = z.object({
  email: z.string().trim().email().max(255),
  source: z.enum(["popup", "footer"]),
});

// Adds a subscriber to the Campaign Monitor list. Campaign Monitor sends the
// confirmation email (confirmed opt-in list or welcome journey).
export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env['CAMPAIGN_MONITOR_API_KEY'];
    const listId = process.env['CAMPAIGN_MONITOR_LIST_ID'];
    if (!apiKey || !listId) throw new Error("Subscriptions are not set up yet.");
    const res = await fetch(`https://api.createsend.com/api/v3.3/subscribers/${encodeURIComponent(listId)}.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:x`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        EmailAddress: data.email,
        Resubscribe: true,
        RestartSubscriptionBasedAutoresponders: true,
        ConsentToTrack: "Yes",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Campaign Monitor subscribe failed [${res.status}]: ${body}`);
      throw new Error("We couldn't sign you up. Please try again.");
    }
    return { ok: true };
  });

/* ---------- Pop-up content (admin editable, stored in site_settings) ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function signImage(content: NewsletterPopupContent): Promise<NewsletterPopupContent> {
  const img = content.image;
  if (!img || !img.ref.startsWith(REEL_PREFIX)) return content;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = img.ref.slice(REEL_PREFIX.length);
  const { data } = await supabaseAdmin.storage.from("site-reels").createSignedUrls([path], 60 * 60 * 24 * 7);
  const url = data?.[0]?.signedUrl;
  if (!url) return { ...content, image: null };
  return { ...content, image: { ...img, src: url } };
}

function mergePopup(value: any): NewsletterPopupContent {
  const merged = { ...DEFAULT_POPUP, ...(value ?? {}) };
  if (merged.layout !== "split" && merged.layout !== "stacked") merged.layout = DEFAULT_POPUP.layout;
  if (merged.image && !merged.image.ref) merged.image = DEFAULT_POPUP.image;
  return merged;
}

/** Public: pop-up content, falling back to defaults. */
export const getNewsletterPopup = createServerFn({ method: "GET" }).handler(async (): Promise<NewsletterPopupContent> => {
  try {
    const { publicClient } = await import("./reels.server");
    const { data } = await publicClient().from("site_settings").select("value").eq("key", "newsletter_popup").maybeSingle();
    return await signImage(mergePopup((data as any)?.value));
  } catch {
    return DEFAULT_POPUP;
  }
});

async function adminDb(ctx: { supabase: any }) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Admin: raw saved pop-up content (with a viewable image link) for the editor. */
export const getNewsletterPopupAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NewsletterPopupContent> => {
    const db = await adminDb(context);
    const { data } = await db.from("site_settings").select("value").eq("key", "newsletter_popup").maybeSingle();
    return signImage(mergePopup(data?.value));
  });

const s = (max: number) => z.string().trim().max(max);
const popupSchema = z.object({
  enabled: z.boolean(),
  layout: z.enum(["split", "stacked"]),
  showImage: z.boolean(),
  eyebrow: s(40),
  line1: s(60).min(1),
  line2: s(60),
  description: s(300),
  note: s(120),
  image: z.object({
    ref: z.string().max(1000).refine((u) => u.startsWith(REEL_PREFIX) || u.startsWith("/") || u.startsWith("https://"), "Bad file"),
    alt: s(200),
  }).nullable(),
});

/** Admin: save the pop-up (value null = reset to default). */
export const saveNewsletterPopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ value: popupSchema.nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { error } = data.value
      ? await db.from("site_settings").upsert({ key: "newsletter_popup", value: data.value, updated_at: new Date().toISOString(), updated_by: context.userId })
      : await db.from("site_settings").delete().eq("key", "newsletter_popup");
    if (error) throw new Error(error.message);
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: data.value ? "newsletter_popup.update" : "newsletter_popup.reset", workspace_id: null, target: "newsletter_popup" });
    return { ok: true };
  });
