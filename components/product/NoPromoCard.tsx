import { copy } from "@/lib/copy";
import { Card } from "@/components/ui/Card";

const P = copy.product.promo;
const S = copy.product.strategy;

/**
 * Right column when this product has no promotion in the store's plan (for example after "Tendencia" in the products
 * panel): it only says so plainly; the chart and the metrics stay available.
 */
export function NoPromoCard({ storeName }: { storeName: string }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold">{P.title}</h2>
      <div className="flex flex-col gap-2 rounded-[10px] bg-background px-4 py-4">
        <p className="text-sm font-extrabold leading-snug">{S.noneTitle(storeName)}</p>
        <p className="text-sm text-muted">{S.noneText}</p>
      </div>
    </Card>
  );
}
