import type { Format, Frame, Project } from "@/lib/stillframe/types";
import type { BrandStyle } from "./renderFrame";

/** Everything the banner player needs; embedded as JSON in index.html. */
export type Html5Doc = {
  project: Project;
  frames: Frame[];
  brand: BrandStyle;
  format: Format;
  width: number;
  height: number;
  watermark: boolean;
  /** 0 = loop forever. */
  loops: number;
  /** Storage path → file name inside the zip. */
  images: Record<string, string>;
  fonts: { family: string; weight: number; file: string; unicodeRange?: string }[];
};

/** Only http(s) links are allowed as the click-through. */
export function safeClickUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function bannerHtml(title: string, width: number, height: number, clickUrl: string, docJson: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  // JSON inside <script> must not be able to close the tag.
  const safeJson = docJson.replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=${width},height=${height}">
<meta name="viewport" content="width=${width},height=${height}">
<title>${esc(title)}</title>
<script>var clickTag = ${JSON.stringify(clickUrl)};</script>
<style>html,body{margin:0;padding:0;overflow:hidden;background:#000}#link{display:block;width:${width}px;height:${height}px;cursor:pointer}#ad{display:block;width:${width}px;height:${height}px}</style>
</head>
<body>
<a id="link" href="javascript:void(0)" onclick="if(window.clickTag)window.open(window.clickTag,'_blank');return false;" aria-label="${esc(title)}"><canvas id="ad" width="${width}" height="${height}"></canvas></a>
<script>window.__GP_AD__ = ${safeJson};</script>
<script src="ad.js"></script>
</body>
</html>
`;
}
