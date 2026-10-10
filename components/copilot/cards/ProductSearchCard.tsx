import { copy } from "@/lib/copy";
import { formatMoney } from "@/lib/copilot/format";
import { t } from "@/lib/labels";
import type { ProductSearch } from "@/types/copilot";

import { CardShell } from "../ui/CardShell";

const S = copy.copilot.search;

export function ProductSearchCard({ data }: { data: ProductSearch }) {
  return (
    <CardShell eyebrow={S.eyebrow} title={S.title(data.query)}>
      {data.products.length === 0 ? (
        <p className="text-sm text-muted">{S.empty}</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {data.products.map((p) => (
            <li key={p.product_id} className="flex justify-between gap-3 py-1.5">
              <span>
                <span className="font-mono text-xs text-subtle">{p.product_id}</span> {p.product_name}
                <span className="text-subtle"> · {t("category", p.category_id)}</span>
              </span>
              <span className="tabular text-muted">{formatMoney(p.retail_price)}</span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}
