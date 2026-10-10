import { copy } from "@/lib/copy";
import { Button } from "./Button";

const P = copy.common.pagination;

/** Server-side pagination footer: range text plus previous/next. `total` and `pageSize` come from the API page. */
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  disabled = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (total <= 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label={P.label} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="text-sm text-muted">{P.range(from, to, total)}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted">{P.page(page, pages)}</span>
        <Button variant="secondary" size="sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>{P.prev}</Button>
        <Button variant="secondary" size="sm" disabled={disabled || page >= pages} onClick={() => onChange(page + 1)}>{P.next}</Button>
      </div>
    </nav>
  );
}
