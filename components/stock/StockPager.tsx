import { copy } from "@/lib/copy";

const P = copy.stock.pager;

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-[10px] border border-line bg-white px-4 text-sm font-semibold hover:bg-background disabled:cursor-not-allowed disabled:opacity-50";

export function StockPager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label={P.label} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p aria-live="polite" className="text-sm text-muted">
        {P.range(from, to, total)} · {P.page(page, totalPages)}
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {P.prev}
        </button>
        <button type="button" className={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          {P.next}
        </button>
      </div>
    </nav>
  );
}
