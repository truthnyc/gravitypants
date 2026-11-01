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

/** Uploads an MP4 to Shopify once, then attaches it to each product's media gallery. */
export async function addVideoToProducts(shop: string, token: string, file: Blob, filename: string, productIds: string[], alt: string) {
  const staged = await adminGraphql<Staged>(shop, token, `mutation S($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } } }`, {
    input: [{ resource: "VIDEO", filename, mimeType: "video/mp4", fileSize: String(file.size), httpMethod: "POST" }],
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
      media: [{ mediaContentType: "VIDEO", originalSource: target.resourceUrl, alt: alt.slice(0, 500) }],
    });
    if (r.productCreateMedia.mediaUserErrors.length) failed.push(r.productCreateMedia.mediaUserErrors[0].message);
  }
  return { added: productIds.length - failed.length, failed };
}
