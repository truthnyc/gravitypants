/** Turns a reel's video link into a direct download link. Stored files get a
 * `download` name so the browser saves them instead of playing them. */
export function reelDownloadUrl(video: string | null | undefined, name: string): string | null {
  if (!video || !/^(https:\/\/|\/)/.test(video)) return null;
  const file = `${name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "reel"}.mp4`;
  if (!video.includes("/storage/v1/object/")) return video;
  const u = new URL(video);
  u.searchParams.set("download", file);
  return u.toString();
}
