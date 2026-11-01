import { describe, expect, it } from "vitest";
import { PAGE_METADATA, pageStructuredData } from "@/lib/site/page-metadata";

const origin = "https://gravitypants.com";

describe("public page structured-data identities", () => {
  it("describes the software rather than clothing products on all 37 pages", () => {
    expect(Object.keys(PAGE_METADATA)).toHaveLength(37);
    for (const [path, metadata] of Object.entries(PAGE_METADATA)) {
      const schema = pageStructuredData(path, metadata, origin);
      expect(schema.url).toBe(`${origin}${path}`);
      expect(schema["@id"]).toBe(`${origin}${path}#webpage`);
      expect(schema["@type"]).not.toBe("Product");
    }
  });

  it("connects article pages to their own article instead of a product", () => {
    const path = "/blog/how-to-turn-photos-into-a-video";
    const schema = pageStructuredData(path, PAGE_METADATA[path], origin);
    expect(schema.mainEntity).toEqual({ "@id": `${origin}${path}#article` });
    expect(schema.about).toBeUndefined();
  });

  it("uses the shared software identity for marketing pages", () => {
    const schema = pageStructuredData("/for/fashion", PAGE_METADATA["/for/fashion"], origin);
    expect(schema.about?.["@type"]).toBe("SoftwareApplication");
    expect(schema.about?.["@id"]).toBe(`${origin}/#software`);
  });
});