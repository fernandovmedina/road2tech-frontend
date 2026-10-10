import { copy } from "@/lib/copy";
import { formatDate, formatNumber, formatPct } from "@/lib/format";
import { tList } from "@/lib/labels";
import { EmptyState } from "@/components/ui/States";
import type { RestockSuggestion } from "@/types";

const S = copy.calendar.suppliersTab;
const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Group = {
  supplierId: string;
  name: string;
  reliability: number;
  items: RestockSuggestion[];
};

// Groups only what the loaded suggestions already say; nothing is invented per supplier.
function groupBySupplier(items: RestockSuggestion[]): Group[] {
  const groups = new Map<string, Group>();
  for (const s of items) {
    const g = groups.get(s.supplier.supplier_id) ?? {
      supplierId: s.supplier.supplier_id,
      name: s.supplier.supplier_name,
      reliability: s.supplier.reliability_score,
      items: [],
    };
    g.items.push(s);
    groups.set(g.supplierId, g);
  }
  return [...groups.values()];
}

const range = (values: number[]) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? formatNumber(min) : `${formatNumber(min)}–${formatNumber(max)}`;
};

function deliveryDays(items: RestockSuggestion[]): string {
  const days = new Set(items.flatMap((s) => s.supplier.delivery_days.split("|").map((d) => d.trim())));
  const ordered = [...days].sort((a, b) => {
    const ia = WEEKDAY_ORDER.indexOf(a);
    const ib = WEEKDAY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return tList("weekday", ordered.join("|"));
}

export function SupplierSummaryList({ suggestions }: { suggestions: RestockSuggestion[] }) {
  const groups = groupBySupplier(suggestions);
  if (groups.length === 0) return <EmptyState text={S.none} />;

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((g) => {
        const pending = g.items.filter((s) => s.order_status !== "sent");
        const next = pending.map((s) => s.expected_delivery_date).sort()[0];
        return (
          <li key={g.supplierId} className="rounded-xl border border-line p-3">
            <p className="text-sm font-bold">{g.name}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div><dt className="text-muted">{S.punctuality}</dt><dd className="font-semibold">{formatPct(g.reliability)}</dd></div>
              <div><dt className="text-muted">{S.leadTime}</dt><dd className="font-semibold">{range(g.items.map((s) => s.supplier.lead_time_days))} {copy.calendar.days}</dd></div>
              <div><dt className="text-muted">{S.deliveryDays}</dt><dd className="font-semibold">{deliveryDays(g.items)}</dd></div>
              <div><dt className="text-muted">{S.minOrder}</dt><dd className="font-semibold">{range(g.items.map((s) => s.supplier.min_order_qty))} {copy.common.units}</dd></div>
              <div><dt className="text-muted">{S.nextDelivery}</dt><dd className="font-semibold">{next ? formatDate(next) : copy.stock.none}</dd></div>
              <div><dt className="text-muted">{S.itemsToOrder}</dt><dd className="font-semibold">{formatNumber(pending.length)}</dd></div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
