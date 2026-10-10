import { ArrowUpRight, Boxes, ChevronRight, MapPin, PackageSearch, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useBranchProductPredictions } from "@/lib/api/storeDemand";
import { formatInteger, formatSignedPercent } from "@/lib/format";
import { RISK_PRESENTATION, ZONE_LABELS } from "@/lib/opportunities/storePresentation";
import type { Branch } from "@/types/branch";

type BranchProductOverviewPanelProps = {
  branch: Branch;
  category?: string;
  tag?: string;
  onSelectProduct: (productId: string) => void;
};

export function BranchProductOverviewPanel({
  branch,
  category,
  tag,
  onSelectProduct,
}: BranchProductOverviewPanelProps) {
  const query = useBranchProductPredictions(branch.id, { category, tag });

  return (
    <article className="flex flex-col gap-5" aria-label={`${branch.name} product predictions`}>
      <header>
        <p className="text-xs font-medium text-ink-secondary">Selected branch · All products</p>
        <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-ink">{branch.name}</h2>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-secondary">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{branch.colonia}</span>
          <span className="inline-flex items-center gap-1"><Store className="size-3.5" aria-hidden />{ZONE_LABELS[branch.zoneType]}</span>
        </div>
      </header>

      <section aria-labelledby="priority-products-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 id="priority-products-heading" className="text-sm font-semibold text-ink">Priority products</h3>
            <p className="mt-0.5 text-xs text-ink-secondary">Highest stock risk and forecast demand for this branch.</p>
          </div>
          <PackageSearch className="size-5 shrink-0 text-brand" aria-hidden />
        </div>

        <div className="mt-3 space-y-2" aria-busy={query.isPending}>
          {query.isPending ? (
            [0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[78px] rounded-xl" />)
          ) : query.isError ? (
            <StatusMessage
              tone="error"
              title="We couldn't load product predictions"
              description="Try loading this branch again."
              action={<button type="button" className="mt-2 text-sm font-semibold text-brand" onClick={() => query.refetch()}>Try again</button>}
            />
          ) : query.data?.length ? (
            query.data.map(({ product, prediction }) => {
              const risk = RISK_PRESENTATION[prediction.risk];
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-ink/10 bg-surface p-3 text-left transition hover:border-brand/40 hover:bg-brand-soft/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ color: risk.color, backgroundColor: risk.softColor }}>
                    <Boxes className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{product.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-secondary">
                      <span>{formatInteger(prediction.predictedDailyDemand)} units/day</span>
                      <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: risk.color }}>
                        <ArrowUpRight className="size-3" aria-hidden />{formatSignedPercent(prediction.upliftPct)}
                      </span>
                      <span>{risk.label}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-ink">+{formatInteger(prediction.recommendedExtraUnits)}</span>
                    <span className="text-[10px] text-ink-muted">suggested</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
                </button>
              );
            })
          ) : (
            <StatusMessage tone="empty" title="No products match these filters" description="Choose another category or demand driver." />
          )}
        </div>
      </section>
    </article>
  );
}
