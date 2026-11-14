import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBrandProducts, getReelProducts, recordProductClick } from "@/lib/directory/products.functions";
import { formatPrice, productHref, type ReelProduct } from "@/lib/directory/products";

function ProductRows({ products, heading, className }: { products: ReelProduct[]; heading: string; className?: string | undefined }) {
  const record = useServerFn(recordProductClick);
  if (!products.length) return null;
  return <div className={className}>
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-ap-muted">{heading}</p>
    <ul className="flex flex-col gap-1.5">
      {products.map((p) => <li key={p.id}>
        <a href={productHref(p.url, p.reel_id ?? p.site_reel_id ?? null)} target="_blank" rel="noopener" onClick={() => void record({ data: { productId: p.id } }).catch(() => {})}
          className="flex !min-h-0 items-center justify-between gap-3 rounded-[10px] bg-ap-panel px-3 py-2 text-[14px] text-ap-ink no-underline">
          <span className="flex min-w-0 items-center gap-2">
            {(p.image_url ?? p.image_path) && <img src={(p.image_url ?? p.image_path)!} alt="" loading="lazy" className="size-7 flex-none rounded-[4px] object-cover" />}
            <span className="truncate">{p.name} <span aria-hidden>↗</span></span>
          </span>
          {p.price != null && <span className="flex-none text-[9.5px] font-semibold tabular-nums">{formatPrice(p.price, p.currency)}</span>}
        </a>
      </li>)}
    </ul>
  </div>;
}

/** "From this reel" list; renders nothing when the reel has no products. Works for Directory and website reels. */
export function ReelProductList({ reelId, className }: { reelId: string | null | undefined; className?: string | undefined }) {
  const fetchFn = useServerFn(getReelProducts);
  const { data } = useQuery({ queryKey: ["reel-products", reelId], enabled: !!reelId, staleTime: 60_000, queryFn: () => fetchFn({ data: { reelIds: [reelId!], siteReelIds: [reelId!] } }) });
  return <ProductRows products={data ?? []} heading="From this reel" className={className} />;
}

/** Brand page "Products" section; renders nothing when the brand has no products. */
export function BrandProductList({ brandId }: { brandId: string }) {
  const fetchFn = useServerFn(getBrandProducts);
  const { data } = useQuery({ queryKey: ["brand-products", brandId], staleTime: 60_000, queryFn: () => fetchFn({ data: { brandId } }) });
  if (!data?.length) return null;
  return <section className="mt-8" aria-labelledby="brand-products-title">
    <h2 id="brand-products-title" className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">Products</h2>
    <ProductRows products={data} heading="From this brand's reels" className="max-w-xl" />
  </section>;
}
