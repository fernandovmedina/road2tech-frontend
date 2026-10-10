import { ProductDetail } from "@/components/product/ProductDetail";

export const instant = false;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail productId={id} />;
}
