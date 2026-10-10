"use client";

import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatPct } from "@/lib/format";
import { t } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import type { ChatMessage } from "@/types";

const C = copy.chat;

/** What the assistant understood from the request: product/category, weekday and maximum discount (a fraction). */
export function ConstraintChips({ constraints }: { constraints: NonNullable<ChatMessage["constraints"]> }) {
  const { nameOf } = useCatalog();
  const chips: string[] = [
    ...constraints.product_ids.map((id) => nameOf(id)),
    ...(constraints.category_id ? [t("category", constraints.category_id)] : []),
    ...(constraints.weekday ? [t("weekday", constraints.weekday)] : []),
    ...(constraints.max_discount_pct !== null ? [C.maxDiscount(formatPct(constraints.max_discount_pct))] : []),
  ];
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted">{C.constraintsTitle}</p>
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((chip, i) => (
          <li key={`${chip}-${i}`}>
            <Badge tone="orange">{chip}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
