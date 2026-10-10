import { Fragment } from "react";
import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";
import { formatMoneyExact } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { PolicyItem } from "@/types";
import { hasErrors, validateEdit, type PolicyEdit, type PolicySuggestionItem } from "./policyEdits";

const P = copy.products;

function NumberInput({
  id,
  label,
  value,
  error,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <input
        id={id}
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={error ? `${id}-err` : undefined}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-24 rounded-control border bg-card px-3 text-right text-sm font-semibold tabular-nums ${invalid ? "border-alert" : "border-line"}`}
      />
      {error && <p id={`${id}-err`} className="max-w-40 text-xs font-medium text-alert-dark">{error}</p>}
    </div>
  );
}

export const POLICY_COLUMNS = 8;

export function PolicyRow({
  item,
  edit,
  suggestion,
  onChange,
}: {
  item: PolicyItem;
  edit: PolicyEdit | undefined;
  suggestion: PolicySuggestionItem | undefined;
  onChange: (field: "min" | "max", value: string) => void;
}) {
  const errors = edit ? validateEdit(edit) : {};
  const invalid = hasErrors(errors);
  const id = item.product_id;

  return (
    <Fragment>
      <tr className={`${suggestion ? "" : "border-b border-line"} ${edit ? "bg-accent-tint/40" : ""}`}>
        <td className="px-5 py-3">
          <span className="block font-bold">{item.product_name}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {id}
            {edit && <Badge tone="amber">{P.unsavedRow}</Badge>}
          </span>
        </td>
        <td className="py-3 pr-3">{t("category", item.category_id)}</td>
        <td className="py-3 pr-3 text-right">{formatMoneyExact(item.unit_cost)}</td>
        <td className="py-3 pr-3 text-right">{formatMoneyExact(item.retail_price)}</td>
        <td className="py-3 pr-3 text-right">{P.minOrderUnits(item.min_order_qty)}</td>
        <td className="py-3 pr-3 text-right">{P.shelfLifeDays(item.shelf_life_days)}</td>
        <td className="py-2 pr-3 align-top">
          <NumberInput
            id={`min-${id}`}
            label={P.minLabel(item.product_name)}
            value={edit?.min ?? String(item.reorder_point)}
            error={errors.min}
            invalid={!!errors.min || !!errors.pair}
            onChange={(v) => onChange("min", v)}
          />
        </td>
        <td className="py-2 pr-5 align-top">
          <NumberInput
            id={`max-${id}`}
            label={P.maxLabel(item.product_name)}
            value={edit?.max ?? String(item.max_stock)}
            error={errors.max ?? errors.pair}
            invalid={invalid}
            onChange={(v) => onChange("max", v)}
          />
        </td>
      </tr>
      {suggestion && (
        <tr className="border-b border-line bg-primary-tint/50">
          <td colSpan={POLICY_COLUMNS} className="px-5 py-2.5 text-sm">
            <span className="font-bold text-primary">
              {P.suggestion(suggestion.suggested.reorder_point, suggestion.suggested.max_stock)}
            </span>
            <p className="mt-0.5 text-foreground">{suggestion.reason}</p>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
