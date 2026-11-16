// Shared file delivery for the Export screen. Safari is the strict browser here:
// it blocks downloads inside framed previews and drops the click "permission" after waits.

export function isFramed(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

export function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|EdgiOS\/|Edg\//.test(ua);
}

/** Safari never allows downloads from inside the editor preview frame. */
export function downloadsBlockedHere(): boolean {
  return isFramed() && isSafari();
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  // Safari ignores clicks on anchors that aren't in the document.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Keep the URL alive well past the click — revoking too early cancels the save on some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Call straight from a click. Phones and tablets get the share sheet ("Save Video", "Save to Files"). */
export async function deliverFile(blob: Blob, name: string) {
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.share === "function") {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; }
      catch (e) { if ((e as DOMException).name === "AbortError") return; }
    }
  }
  saveBlob(blob, name);
}

/** Saved files: a link that tells the browser to save the file. Works after waits, unlike a click-started save. */
export function saveFromUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
