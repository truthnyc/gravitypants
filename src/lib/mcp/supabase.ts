import { createClient } from "@supabase/supabase-js";
import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("Sign in before accessing your ads.");
  const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Account connection is unavailable.");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* Verifies the OAuth caller is platform staff, records the read, then returns the privileged client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function adminForStaff(ctx: ToolContext, action: string): Promise<any> {
  const { data, error } = await supabaseForUser(ctx).rpc("is_platform_admin");
  if (error || data !== true) throw new ToolError("Admin role required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({ admin_user_id: ctx.getUserId()!, action: `mcp:${action}`, workspace_id: null, target: null, reason: "Claude connector read" });
  return supabaseAdmin;
}
