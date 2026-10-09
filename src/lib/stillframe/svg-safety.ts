import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

// Static artwork only: no scripts, embedded documents, animation, or remote resources.
const TAGS = new Set("svg g defs symbol use path rect circle ellipse line polyline polygon text tspan title desc linearGradient radialGradient stop clipPath mask pattern filter feGaussianBlur feOffset feBlend feColorMatrix feComposite feFlood feMerge feMergeNode".split(" "));
const ATTRS = new Set("id xmlns xmlns:xlink viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform fill fill-rule fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset stroke-opacity opacity color clip-path clip-rule mask filter gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity fx fy fr patternUnits patternContentUnits patternTransform preserveAspectRatio text-anchor dominant-baseline font-family font-size font-weight letter-spacing dx dy stdDeviation in in2 result mode type values operator k1 k2 k3 k4 flood-color flood-opacity href xlink:href style".split(" "));
const STYLE = new Set("fill fill-rule fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-opacity opacity color font-family font-size font-weight text-anchor letter-spacing".split(" "));
type Node = Record<string, unknown>;

function safeValue(value: string) {
  // Paint servers and clipping may refer to local IDs, never URLs or data payloads.
  return !/[\\<>]|@|expression\s*\(|(?:https?|data|javascript):/i.test(value)
    && [...value.matchAll(/url\s*\(([^)]*)\)/gi)].every((m) => /^\s*['"]?#[\w.-]+['"]?\s*$/.test(m[1] ?? ""));
}

/** Rebuild a validated SVG from a static-artwork allowlist, in browser or server. */
export function sanitizeSvg(source: string): string {
  if (source.length > 5 * 1024 * 1024 || /<!\s*(?:DOCTYPE|ENTITY)/i.test(source) || XMLValidator.validate(source) !== true) {
    throw new Error("That SVG couldn't be safely read. Try another SVG or a PNG logo.");
  }
  const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, processEntities: false, trimValues: false });
  const nodes = parser.parse(source) as Node[];
  const roots = nodes.filter((node) => Object.keys(node).some((key) => key !== ":@" && !key.startsWith("?")));
  if (roots.length !== 1 || !roots[0]?.["svg"]) throw new Error("Choose a valid SVG logo.");
  let count = 0;
  const clean = (list: Node[], depth: number): Node[] => {
    if (depth > 64 || (count += list.length) > 20_000) throw new Error("That SVG is too complex. Try a simpler SVG or a PNG logo.");
    return list.flatMap<Node>((node) => {
      const tag = Object.keys(node).find((key) => key !== ":@");
      if (tag === "#text") return [{ "#text": node[tag] }];
      if (!tag || !TAGS.has(tag)) return [];
      const attrs: Record<string, string> = {};
      for (const [key, raw] of Object.entries((node[":@"] ?? {}) as Node)) {
        const name = key.replace(/^@_/, "");
        const value = String(raw);
        if (!ATTRS.has(name) || (!name.startsWith("xmlns") && !safeValue(value))) continue;
        if ((name === "href" || name === "xlink:href") && !/^#[\w.-]+$/.test(value)) continue;
        if (name === "xmlns" && value !== "http://www.w3.org/2000/svg") continue;
        if (name === "xmlns:xlink" && value !== "http://www.w3.org/1999/xlink") continue;
        attrs[key] = name === "style" ? value.split(";").filter((rule) => STYLE.has(rule.split(":")[0]?.trim().toLowerCase() ?? "") && safeValue(rule)).join(";") : value;
      }
      if (tag === "svg") attrs["@_xmlns"] = "http://www.w3.org/2000/svg";
      return [{ [tag]: clean(Array.isArray(node[tag]) ? node[tag] as Node[] : [], depth + 1), ":@": attrs }];
    });
  };
  return new XMLBuilder({ preserveOrder: true, ignoreAttributes: false, processEntities: true }).build(clean(roots, 0));
}

export async function sanitizeLogoFile(file: File): Promise<File> {
  if (file.type !== "image/svg+xml" && !/\.svg$/i.test(file.name)) return file;
  return new File([sanitizeSvg(await file.text())], file.name, { type: "image/svg+xml", lastModified: file.lastModified });
}