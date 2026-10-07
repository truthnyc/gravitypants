import { describe, expect, it } from "vitest";
import { loadEnv } from "vite";

// Live access checks: public configuration only, never log tokens or response records.
const env = loadEnv("test", process.cwd(), "VITE_");
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const unknown = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const token: string | undefined = session ? JSON.parse(session).access_token : undefined;

async function rpc(name: string, args: Record<string, unknown> = {}, bearer?: string, schema = "public") {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      "Content-Profile": schema,
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(args),
  });
  return { status: response.status, ok: response.ok, data: await response.json() };
}

describe.skipIf(!url || !key)("Live database access boundaries", () => {
  it('denies anonymous request reads', async () => {
    const response = await fetch(`${url}/rest/v1/brand_requests?select=id`, { headers: { apikey: key } });
    expect(response.ok).toBe(false);
    expect([401, 403]).toContain(response.status);
  });
  it('denies direct request inserts that bypass spam protection', async () => {
    const response = await fetch(`${url}/rest/v1/brand_requests`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Denied check', email: 'denied@example.com', brand: 'Denied check', status: 'pending' }) });
    expect(response.ok).toBe(false);
    expect([401, 403]).toContain(response.status);
  });
  it('does not expose the visitor rate-limit counter to applicants', async () => {
    const result = await rpc('consume_brand_request_limit', { _visitor_hash: 'a'.repeat(64) });
    expect(result.ok).toBe(false);
    expect([401, 403, 404]).toContain(result.status);
  });
  it("keeps public directory search available", async () => {
    const result = await rpc("search_directory");
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
  it("denies anonymous workspace creation", async () => {
    const result = await rpc("ensure_workspace");
    expect(result.ok).toBe(false);
    expect([401, 403, 404]).toContain(result.status);
  });
  it("does not expose private implementations through the API", async () => {
    const result = await rpc("brand_visible", { _brand: unknown }, undefined, "private");
    expect(result.ok).toBe(false);
    expect(result.data.code).toBe("PGRST106");
  });
  it.skipIf(!token)("denies recording an export without workspace membership", async () => {
    const result = await rpc("record_export", { _ws: unknown, _project: null, _stamp: "security-test-denied" }, token);
    expect(result.ok).toBe(true);
    expect(result.data).toBe(false);
  });
  it.skipIf(!token)("does not expose another workspace's member emails", async () => {
    const result = await rpc("workspace_member_list", { _ws: unknown }, token);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual([]);
  });
  it.skipIf(!token)("keeps staff approval restricted to server calls", async () => {
    const result = await rpc("approve_brand_request", { _request_id: unknown, _admin_id: unknown }, token);
    expect(result.ok).toBe(false);
    expect([401, 403, 404]).toContain(result.status);
  });
});