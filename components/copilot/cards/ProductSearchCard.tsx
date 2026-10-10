import { formatMoney } from "@/lib/copilot/format";
import type { ProductSearch } from "@/types/copilot";

import { CardShell } from "../ui/CardShell";

export function ProductSearchCard({ data }: { data: ProductSearch }) {
  return (
    <CardShell eyebrow="Catalog search" title={`Products matching “${data.query}”`}>
      {data.products.length === 0 ? (
        <p className="text-sm text-sc-ink-secondary">No product matches. Try a brand or a category name.</p>
      ) : (
        <ul className="divide-y divide-[var(--sc-border)] text-sm">
          {data.products.map((p) => (
            <li key={p.product_id} className="flex justify-between gap-3 py-1.5">
              <span>
                <span className="font-mono text-xs text-sc-ink-muted">{p.product_id}</span> {p.product_name}
                <span className="text-sc-ink-muted"> · {p.category_name}</span>
              </span>
              <span className="tabular text-sc-ink-secondary">{formatMoney(p.retail_price)}</span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}
