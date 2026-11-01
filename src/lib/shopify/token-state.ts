// Pure decision about a stored shop token: can it be used as-is, or must it be
// migrated / refreshed / re-obtained first? Browser-safe (no imports, no env).
export type TokenRow = {
  hasToken: boolean;
  /** ms epoch when the stored access token stops working; null = legacy non-expiring token */
  expiresAt: number | null;
  /** ms epoch when the stored refresh token stops working; null = unknown */
  refreshExpiresAt: number | null;
};

export type TokenAction = "stored" | "migrate" | "refresh" | "reauthorize";

// Refresh a minute early so a request never starts on a token that dies mid-flight.
const SKEW_MS = 60_000;

export function tokenAction(row: TokenRow, now = Date.now()): TokenAction {
  if (!row.hasToken) return "reauthorize";
  // Shopify rejects legacy non-expiring offline tokens outright, so swap it first.
  if (row.expiresAt === null) return "migrate";
  if (row.expiresAt - SKEW_MS > now) return "stored";
  if (row.refreshExpiresAt === null || row.refreshExpiresAt > now) return "refresh";
  return "reauthorize";
}
