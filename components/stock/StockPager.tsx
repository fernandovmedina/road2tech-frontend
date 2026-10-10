import { Pagination } from "@/components/ui/Pagination";

/** Server pagination footer for the stock table; delegates to the standard pagination component. */
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
  return <Pagination page={page} pageSize={pageSize} total={total} onChange={onChange} />;
}
