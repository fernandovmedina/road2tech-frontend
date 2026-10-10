import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";
import { formatNumber, formatPct } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Supplier } from "@/types";

const S = copy.suppliers;
const VISIBLE_CATEGORIES = 2;

export function SupplierTable({
  suppliers,
  selectedId,
  onSelect,
}: {
  suppliers: Supplier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{S.tableLabel}</caption>
          <thead className="sticky top-0 z-10 bg-white text-xs font-bold uppercase tracking-wide text-muted shadow-[0_1px_0_var(--color-line)]">
            <tr>
              <th scope="col" className="px-5 py-3">{S.cols.name}</th>
              <th scope="col" className="py-3 pr-3">{S.cols.city}</th>
              <th scope="col" className="py-3 pr-3">{S.cols.categories}</th>
              <th scope="col" className="py-3 pr-3">{S.cols.reliability}</th>
              <th scope="col" className="py-3 pr-5 text-right">{S.cols.offers}</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => {
              const selected = s.supplier_id === selectedId;
              const shown = s.categories_served.slice(0, VISIBLE_CATEGORIES);
              const extra = s.categories_served.length - shown.length;
              return (
                <tr
                  key={s.supplier_id}
                  onClick={() => onSelect(s.supplier_id)}
                  className={`cursor-pointer border-t border-line transition-colors ${selected ? "bg-primary-tint" : "hover:bg-background"}`}
                >
                  <td className="px-5 py-1.5">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={(e) => { e.stopPropagation(); onSelect(s.supplier_id); }}
                      className="block min-h-11 w-full rounded-lg text-left"
                    >
                      <span className="block font-bold text-foreground">{s.supplier_name}</span>
                      <span className="block break-all text-xs text-muted">{s.email}</span>
                    </button>
                  </td>
                  <td className="py-2 pr-3">{s.city}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1" title={s.categories_served.map((c) => t("category", c)).join(", ")}>
                      {shown.map((c) => <Badge key={c} tone="gray">{t("category", c)}</Badge>)}
                      {extra > 0 && <Badge tone="gray">{S.moreCategories(extra)}</Badge>}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2" title={S.reliabilityHint}>
                      <span className="w-10 font-semibold">{formatPct(s.reliability_score)}</span>
                      <span aria-hidden className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(s.reliability_score * 100)}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-5 text-right font-semibold">{formatNumber(s.offers_count)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
