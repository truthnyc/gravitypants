import { afterEach, describe, expect, it, vi } from "vitest";
import { tokenAction } from "@/lib/shopify/token-state";
import { exchangeOfflineToken, migrateOfflineToken, refreshOfflineToken, tokenExpiry } from "@/lib/shopify/shopify.server";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-01T13:55:00Z");
const TOKEN_URL = "https://shop.myshopify.com/admin/oauth/access_token";

const sent = (call: unknown) => {
  const [url, init] = call as [string, { body: string; headers: Record<string, string> }];
  return { url, params: new URLSearchParams(init.body), type: init.headers["Content-Type"] };
};

describe("stored shop token decision", () => {
  it("migrates a legacy token that never expires", () => {
    expect(tokenAction({ hasToken: true, expiresAt: null, refreshExpiresAt: null }, NOW)).toBe("migrate");
  });
  it("uses a token that still has more than a minute left", () => {
    expect(tokenAction({ hasToken: true, expiresAt: NOW + 120_000, refreshExpiresAt: NOW + 90 * DAY }, NOW)).toBe("stored");
  });
  it("refreshes inside the one-minute safety window", () => {
    expect(tokenAction({ hasToken: true, expiresAt: NOW + 30_000, refreshExpiresAt: NOW + 90 * DAY }, NOW)).toBe("refresh");
  });
  it("asks the merchant to reopen the app once the refresh token is dead", () => {
    expect(tokenAction({ hasToken: true, expiresAt: NOW - 1, refreshExpiresAt: NOW - 1 }, NOW)).toBe("reauthorize");
  });
  it("asks the merchant to reopen the app when nothing is stored", () => {
    expect(tokenAction({ hasToken: false, expiresAt: null, refreshExpiresAt: null }, NOW)).toBe("reauthorize");
  });
});

describe("Shopify token requests", () => {
  afterEach(() => vi.unstubAllGlobals());

  const reply = (body: Record<string, unknown>) =>
    vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));

  it("requests an expiring offline token when a store installs the app", async () => {
    const fetchMock = reply({ access_token: "a", scope: "write_products", refresh_token: "r", expires_in: 3600, refresh_token_expires_in: 7776000 });
    vi.stubGlobal("fetch", fetchMock);
    const pair = await exchangeOfflineToken("shop.myshopify.com", "idtoken", "key", "sec");
    const s = sent(fetchMock.mock.calls[0]);
    expect(s.url).toBe(TOKEN_URL);
    expect(s.type).toBe("application/x-www-form-urlencoded");
    expect(s.params.get("expiring")).toBe("1");
    expect(s.params.get("subject_token")).toBe("idtoken");
    expect(s.params.get("subject_token_type")).toBe("urn:ietf:params:oauth:token-type:id_token");
    expect(pair.refresh_token).toBe("r");
    expect(pair.expires_in).toBe(3600);
  });

  it("migrates a stored non-expiring token with expiring=1", async () => {
    const fetchMock = reply({ access_token: "a", expires_in: 3600 });
    vi.stubGlobal("fetch", fetchMock);
    await migrateOfflineToken("shop.myshopify.com", "old-token", "key", "sec");
    const s = sent(fetchMock.mock.calls[0]);
    expect(s.params.get("subject_token")).toBe("old-token");
    expect(s.params.get("subject_token_type")).toBe("urn:shopify:params:oauth:token-type:offline-access-token");
    expect(s.params.get("requested_token_type")).toBe("urn:shopify:params:oauth:token-type:offline-access-token");
    expect(s.params.get("expiring")).toBe("1");
  });

  it("refreshes with the refresh_token grant and keeps the rotated pair", async () => {
    const fetchMock = reply({ access_token: "a2", refresh_token: "r2", expires_in: 3600, refresh_token_expires_in: 7776000 });
    vi.stubGlobal("fetch", fetchMock);
    const pair = await refreshOfflineToken("shop.myshopify.com", "r", "key", "sec");
    const s = sent(fetchMock.mock.calls[0]);
    expect(s.params.get("grant_type")).toBe("refresh_token");
    expect(s.params.get("refresh_token")).toBe("r");
    expect(s.params.get("expiring")).toBeNull();
    expect(pair.access_token).toBe("a2");
    expect(pair.refresh_token).toBe("r2");
  });

  it("fails loudly when Shopify refuses the request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: "invalid_subject_token" }) })));
    await expect(migrateOfflineToken("shop.myshopify.com", "old", "key", "sec")).rejects.toThrow("invalid_subject_token");
  });

  it("turns lifetimes into timestamps and keeps unknown lifetimes unknown", () => {
    expect(tokenExpiry(null)).toBeNull();
    expect(Date.parse(tokenExpiry(3600)!) - Date.now()).toBeGreaterThan(3_500_000);
  });
});
