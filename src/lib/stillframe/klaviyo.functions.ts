import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KLAVIYO = "https://a.klaviyo.com/api";
const REVISION = "2024-10-15";

const ws = z.object({ workspaceId: z.string().uuid() });

async function assertMember(sb: { rpc: (fn: "is_workspace_member", a: { _ws: string }) => PromiseLike<{ data: boolean | null }> }, workspaceId: string) {
  const { data } = await sb.rpc("is_workspace_member", { _ws: workspaceId });
  if (!data) throw new Error("You don't have access to this workspace.");
}

function headers(key: string) {
  return { Authorization: `Klaviyo-API-Key ${key}`, revision: REVISION, Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" };
}

function cryptoKey() {
  const k = process.env["KLAVIYO_TOKEN_KEY"];
  if (!k) throw new Error("Klaviyo is not set up yet.");
  return k;
}

export const getKlaviyoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ws.parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("klaviyo_connections").select("account_name, connected_at").eq("workspace_id", data.workspaceId).maybeSingle();
    return row ? { connected: true as const, accountName: row.account_name, connectedAt: row.connected_at } : { connected: false as const };
  });

export const connectKlaviyo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ws.extend({ apiKey: z.string().trim().regex(/^pk_[A-Za-z0-9]{10,200}$/, "That doesn't look like a Klaviyo private key (it starts with pk_).") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId);
    const res = await fetch(`${KLAVIYO}/accounts/`, { headers: headers(data.apiKey) });
    if (!res.ok) {
      console.error("Klaviyo key check failed", res.status, await res.text());
      return { ok: false as const, error: res.status === 401 || res.status === 403 ? "Klaviyo didn't accept that key. Check it has Accounts read and Images full access." : "Couldn't reach Klaviyo. Try again." };
    }
    const body = (await res.json()) as { data?: { attributes?: { contact_information?: { organization_name?: string } } }[] };
    const accountName = body.data?.[0]?.attributes?.contact_information?.organization_name ?? null;
    const { encryptToken } = await import("@/lib/shopify/shopify.server");
    const enc = await encryptToken(data.apiKey, cryptoKey());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("klaviyo_connections").upsert({ workspace_id: data.workspaceId, api_key_enc: enc, account_name: accountName, connected_by: context.userId, connected_at: new Date().toISOString() });
    if (error) throw new Error("Couldn't save the connection.");
    return { ok: true as const, accountName };
  });

export const disconnectKlaviyo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ws.parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("klaviyo_connections").delete().eq("workspace_id", data.workspaceId);
    return { ok: true };
  });

const sendSchema = ws.extend({
  projectId: z.string().uuid(),
  stamp: z.string().regex(/^[A-Za-z0-9T:.\-Z]{1,40}$/),
  name: z.string().regex(/^[^/\\]{1,200}\.gif$/i, "Only GIF files can be sent to Klaviyo."),
});

export const sendGifToKlaviyo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => sendSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("klaviyo_connections").select("api_key_enc").eq("workspace_id", data.workspaceId).maybeSingle();
    if (!row) return { ok: false as const, error: "Connect Klaviyo first." };
    const { decryptToken } = await import("@/lib/shopify/shopify.server");
    const key = await decryptToken(row.api_key_enc, cryptoKey());
    const path = `${data.workspaceId}/exports/${data.projectId}/${data.stamp}/${data.name}`;
    // Signed with the user's own client so storage RLS confirms the file is theirs.
    const { data: signed, error: sErr } = await context.supabase.storage.from("media").createSignedUrl(path, 600);
    if (sErr || !signed) return { ok: false as const, error: "That file couldn't be found." };
    const res = await fetch(`${KLAVIYO}/images/`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({ data: { type: "image", attributes: { name: data.name.replace(/\.gif$/i, ""), import_from_url: signed.signedUrl, hidden: false } } }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("Klaviyo image upload failed", res.status, t);
      if (res.status === 401 || res.status === 403) return { ok: false as const, error: "Klaviyo refused the upload. Reconnect with a key that has Images full access." };
      if (res.status === 413 || /size/i.test(t)) return { ok: false as const, error: "This GIF is too large for Klaviyo (5 MB limit). Try the small file preset." };
      return { ok: false as const, error: `Klaviyo couldn't take this file (${res.status}).` };
    }
    const body = (await res.json()) as { data?: { attributes?: { image_url?: string } } };
    return { ok: true as const, imageUrl: body.data?.attributes?.image_url ?? null };
  });
