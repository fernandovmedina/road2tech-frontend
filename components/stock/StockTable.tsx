import { copy } from "@/lib/copy";
import type { StockItem } from "@/types";
import { StockRow } from "./StockRow";

const S = copy.stock;

export function StockTable({
  items,
  showBranch,
  branchName,
}: {
  items: StockItem[];
  showBranch: boolean;
  branchName: (storeId: string) => string;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <caption className="sr-only">{S.title}</caption>
        <thead>
          <tr className="border-b border-line text-xs font-semibold text-muted">
            <th scope="col" className="px-5 py-3">{S.cols.product}</th>
            {showBranch && <th scope="col" className="py-3 pr-3">{S.cols.branch}</th>}
            <th scope="col" className="py-3 pr-3 text-right">{S.cols.existence}</th>
            <th scope="col" className="w-52 py-3 pr-3">{S.cols.level}</th>
            <th scope="col" className="py-3 pr-3">{S.cols.coverage}</th>
            <th scope="col" className="py-3 pr-3">{S.cols.status}</th>
            <th scope="col" className="py-3 pr-3">{S.cols.inTransit}</th>
            <th scope="col" className="py-3 pr-3">{S.cols.expiry}</th>
            <th scope="col" className="py-3 pr-3">{S.cols.nextRestock}</th>
            <th scope="col" className="py-3 pr-5"><span className="sr-only">{copy.common.viewInCalendar}</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <StockRow key={`${item.store_id}-${item.product_id}`} item={item} branchName={showBranch ? branchName(item.store_id) : null} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
