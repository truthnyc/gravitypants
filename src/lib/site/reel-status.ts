export type ReelVideoStatus = "saved" | "pending" | "failed";

/** Saved: a playable video is attached. Pending: a newer video awaits approval, or an export exists and attaches on next view. Failed: no video anywhere. */
export function reelVideoStatus(r: { video_url: string | null; pending_video_url?: string | null; hasExport: boolean }): ReelVideoStatus {
  if (r.video_url) return "saved";
  if (r.pending_video_url || r.hasExport) return "pending";
  return "failed";
}
