/** Storage allowance per plan family. One place for storage limits and the warning threshold. */
const GB = 1024 ** 3;
export const STORAGE_LIMITS: Record<string, number> = { free: 1 * GB, starter: 5 * GB, simple: 5 * GB, business: 20 * GB, team: 50 * GB };
export const STORAGE_WARN_RATIO = 0.8;

/** "business_yearly" -> "business"; unknown or no plan -> free. */
export function storageLimitFor(plan: string | null | undefined): number {
  const family = (plan ?? "").replace(/_yearly$/, "");
  return STORAGE_LIMITS[family] ?? STORAGE_LIMITS["free"]!;
}

/** Send when usage is at/over 80%, once, until usage drops back below 80%. */
export function storageAlertAction(used: number, limit: number, alreadyAlerted: boolean): "send" | "reset" | "none" {
  const over = used >= limit * STORAGE_WARN_RATIO;
  if (over) return alreadyAlerted ? "none" : "send";
  return alreadyAlerted ? "reset" : "none";
}

export const formatGB = (bytes: number) => `${(bytes / GB).toFixed(bytes < 10 * GB ? 1 : 0)} GB`;
