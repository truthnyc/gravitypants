/** Pure helpers for the Brand stats dashboard (shared by server and tests). */
export const STATS_TIERS = ["business", "team"] as const;

export function statsAllowed(tier: string | null | undefined, admin = false): boolean {
  return admin || (tier != null && (STATS_TIERS as readonly string[]).includes(tier));
}

export function clickRate(clicks: number, views: number): number {
  return views > 0 ? clicks / views : 0;
}

export type StatRow = { name: string; views: number; saves: number; clicks: number; rate: number };

export function rankRows(rows: Omit<StatRow, "rate">[]): StatRow[] {
  return rows.map((r) => ({ ...r, rate: clickRate(r.clicks, r.views) }))
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks);
}

export function tipFor(moods: StatRow[]): string | null {
  const best = moods.filter((m) => m.views >= 5).sort((a, b) => b.rate - a.rate)[0];
  return best && best.clicks > 0 ? `Your ${best.name} reels get the most clicks. Try making another.` : null;
}
