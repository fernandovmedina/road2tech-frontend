import Link from "next/link";
import { useStorePlan } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDate, formatMoney } from "@/lib/format";
import { t } from "@/lib/labels";
import { productHref } from "@/lib/links";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

const P = copy.calendar.plan;
const TOP_N = 3;

/** Top strategies of the store plan (order as the backend ranks them); each links to its product detail. */
export function PlanStrategies({ storeId }: { storeId: string }) {
  const plan = useStorePlan(storeId);

  if (plan.isError) return <ErrorState onRetry={() => plan.refetch()} />;
  if (plan.isPending) return <Skeleton className="h-20" />;

  const strategies = plan.data.strategies.filter((s) => s.status !== "rejected" && s.status !== "expired").slice(0, TOP_N);

  return (
    <section aria-label={P.title}>
      <h3 className="mb-2 mt-1 text-sm font-extrabold">{P.title}</h3>
      {strategies.length === 0 ? (
        <p className="rounded-[10px] bg-background px-3 py-2 text-sm text-muted">{P.none}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {strategies.map((s) => (
            <li key={s.draft_id}>
              <Link
                href={productHref(s.promoted_product_id, { storeId, strategyId: s.draft_id })}
                className="block rounded-xl border border-accent/30 bg-accent-tint/50 p-3 hover:border-accent"
              >
                <p className="text-sm font-bold leading-snug">{s.title}</p>
                <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
                  <span>
                    {formatDate(s.period.start_date)} – {formatDate(s.period.end_date)} · {t("strategyStatus", s.status)}
                  </span>
                  <span className="font-extrabold text-primary">
                    {P.margin} +{formatMoney(s.expected_margin_increment)}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
