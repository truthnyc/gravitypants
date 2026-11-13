import { describe, expect, it } from "vitest";
import { parseFeed, splitPrice } from "@/lib/directory/product-feed";

const xml = `<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel>
${[1,2,3,4,5,6].map((n) => `<item><g:id>SKU${n}</g:id><title><![CDATA[Throw ${n} & Co]]></title><link>https://shop.com/p/${n}</link><g:image_link>https://shop.com/i/${n}.jpg</g:image_link><g:price>${n}4.00 USD</g:price>${n === 2 ? "<g:sale_price>19.50 USD</g:sale_price>" : ""}<g:availability>${n === 3 ? "out of stock" : n === 4 ? "preorder" : "in stock"}</g:availability></item>`).join("")}
</channel></rss>`;

describe("product feed reader", () => {
  it("reads an RSS feed with g: fields, sale price and availability", () => {
    const items = parseFeed(xml);
    expect(items).toHaveLength(6);
    expect(items[0]).toMatchObject({ external_id: "SKU1", name: "Throw 1 & Co", price: 14, currency: "USD", url: "https://shop.com/p/1", image_url: "https://shop.com/i/1.jpg", availability: "in_stock" });
    expect(items[1]!.price).toBe(19.5);
    expect(items[2]!.availability).toBe("out_of_stock");
    expect(items[3]!.availability).toBe("in_stock");
  });
  it("reads an Atom feed", () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0"><entry><g:id>A1</g:id><title>Mug</title><link href="https://m.com/a1"/><g:price>12 EUR</g:price></entry></feed>`;
    expect(parseFeed(atom)[0]).toMatchObject({ external_id: "A1", url: "https://m.com/a1", price: 12, currency: "EUR" });
  });
  it("reads tab-separated and comma-separated feeds", () => {
    const tsv = "id\ttitle\tlink\tprice\tavailability\timage_link\nX1\tScarf\thttps://s.com/x1\t45.00 USD\tin_stock\thttps://s.com/x1.jpg\nX2\tHat\thttps://s.com/x2\t30.00 USD\tout_of_stock\t";
    expect(parseFeed(tsv).map((i) => [i.external_id, i.price, i.availability])).toEqual([["X1", 45, "in_stock"], ["X2", 30, "out_of_stock"]]);
    const csv = 'id,title,link,price\nC1,"Bowl, large",https://b.com/c1,"1,200.00 USD"';
    expect(parseFeed(csv)[0]).toMatchObject({ name: "Bowl, large", price: 1200 });
  });
  it("splits price text", () => {
    expect(splitPrice("24.00 USD")).toEqual({ price: 24, currency: "USD" });
    expect(splitPrice("19,90 EUR")).toEqual({ price: 19.9, currency: "EUR" });
  });
});
