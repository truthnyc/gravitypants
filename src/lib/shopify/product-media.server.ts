import { adminGraphql } from "./shopify.server";

/** Product ids used by a reel's slides, in slide order, unique. */
export function reelProductIds(photos: unknown[]): string[] {
  const ids = photos
    .map((p) => (p as { shopify_product_id?: string } | null)?.shopify_product_id)
    .filter((x): x is string => typeof x === "string" && /^gid:\/\/shopify\/Product\/\d+$/.test(x));
  return [...new Set(ids)];
}

type Staged = { stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: { message: string }[] } };
type Created = { productCreateMedia: { mediaUserErrors: { message: string }[] } };

/** Shopify media type for a file name: GIFs go in as images, MP4s as videos. */
export const mediaKind = (filename: string) => (/\.gif$/i.test(filename) ? "IMAGE" : /\.mp4$/i.test(filename) ? "VIDEO" : null);

/** Uploads an MP4 to Shopify once, then attaches it to each product's media gallery. */
export function addVideoToProducts(shop: string, token: string, file: Blob, filename: string, productIds: string[], alt: string) {
  return addMediaToProducts(shop, token, file, filename, productIds, alt);
}

/** Uploads an MP4 or GIF once, then attaches it to each product's media gallery. */
export async function addMediaToProducts(shop: string, token: string, file: Blob, filename: string, productIds: string[], alt: string) {
  const kind = mediaKind(filename);
  if (!kind) throw new Error("Only MP4 and GIF files can go on product pages.");
  const staged = await adminGraphql<Staged>(shop, token, `mutation S($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } } }`, {
    input: [{ resource: kind, filename, mimeType: kind === "IMAGE" ? "image/gif" : "video/mp4", fileSize: String(file.size), httpMethod: "POST" }],
  });
  const err = staged.stagedUploadsCreate.userErrors[0];
  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (err || !target) throw new Error(err?.message ?? "Shopify did not accept the video.");
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", file, filename);
  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`Uploading to Shopify failed (${up.status}).`);

  const failed: string[] = [];
  for (const productId of productIds) {
    const r = await adminGraphql<Created>(shop, token, `mutation M($productId: ID!, $media: [CreateMediaInput!]!) { productCreateMedia(productId: $productId, media: $media) { mediaUserErrors { message } } }`, {
      productId,
      media: [{ mediaContentType: kind, originalSource: target.resourceUrl, alt: alt.slice(0, 500) }],
    });
    const e = r.productCreateMedia.mediaUserErrors[0];
    if (e) failed.push(e.message);
  }
  return { added: productIds.length - failed.length, failed };
}
