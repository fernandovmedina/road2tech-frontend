import { ProductDetail } from "@/components/product/ProductDetail";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

// /product/[id]?store=<store_id>&strategy=<draft_id>  (links are built with productHref in lib/links.ts)
export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const query = await searchParams;
  return <ProductDetail productId={id} storeId={first(query.store)} strategyId={first(query.strategy)} />;
}
