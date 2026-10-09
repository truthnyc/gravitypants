import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../src/lib/stillframe/svg-safety";
describe("SVG logo safety", () => {
  it("removes scripts, documents and event handlers before saving", () => {
    const svg = sanitizeSvg('<svg onload="alert(1)"><script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject><path d="M0 0L10 10" fill="blue" onclick="alert(2)"/></svg>');
    expect(svg).not.toMatch(/script|onload|onclick|foreignObject|unsafe/);
    expect(svg).toContain('d="M0 0L10 10"');
    expect(svg).toContain('fill="blue"');
  });
  it("blocks remote resources while keeping local gradients", () => {
    const svg = sanitizeSvg('<svg><defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient></defs><path fill="url(#paint)"/><use href="https://evil.test/a"/><use href="#paint"/><path style="fill:url(https://evil.test/a);stroke:blue"/><image href="data:image/svg+xml,test"/></svg>');
    expect(svg).not.toMatch(/evil|data:|<image/);
    expect(svg).toContain('fill="url(#paint)"');
    expect(svg).toContain('href="#paint"');
    expect(svg).toContain('stroke:blue');
  });
  it("rejects malformed SVG and entity declarations", () => {
    expect(() => sanitizeSvg('<svg><path></svg>')).toThrow();
    expect(() => sanitizeSvg('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>')).toThrow();
    expect(() => sanitizeSvg('<html/>')).toThrow();
  });
});
