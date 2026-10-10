// Deep links between screens.
export const productHref = (productId: string, promoId?: string) =>
  `/product/${productId}${promoId ? `?promo=${promoId}` : ""}`;

export function calendarHref(opts: { productId?: string; date?: string; branchId?: string }) {
  const p = new URLSearchParams();
  if (opts.productId) p.set("product", opts.productId);
  if (opts.date) p.set("date", opts.date);
  if (opts.branchId) p.set("branch", opts.branchId);
  const q = p.toString();
  return `/calendar${q ? `?${q}` : ""}`;
}
