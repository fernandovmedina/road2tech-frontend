// Deep links between screens (frozen contract: several screens build these URLs).
// Product detail: /product/[productId]?store=<store_id>&strategy=<draft_id>
// Calendar:       /calendar?store=<store_id>&product=<product_id>&date=<YYYY-MM-DD>

export function productHref(productId: string, opts: { storeId?: string; strategyId?: string } = {}) {
  const p = new URLSearchParams();
  if (opts.storeId) p.set("store", opts.storeId);
  if (opts.strategyId) p.set("strategy", opts.strategyId);
  const q = p.toString();
  return `/product/${productId}${q ? `?${q}` : ""}`;
}

export function calendarHref(opts: { productId?: string; date?: string; storeId?: string }) {
  const p = new URLSearchParams();
  if (opts.storeId) p.set("store", opts.storeId);
  if (opts.productId) p.set("product", opts.productId);
  if (opts.date) p.set("date", opts.date);
  const q = p.toString();
  return `/calendar${q ? `?${q}` : ""}`;
}
