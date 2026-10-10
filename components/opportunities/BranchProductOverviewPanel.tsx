import { ArrowUpRight, Boxes, ChevronRight, MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PanelSection } from "@/components/ui/PanelSection";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { copy } from "@/lib/copy";
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
    <article className="flex flex-col gap-5" aria-label={copy.opportunities.branchOverview.aria(branch.name)}>
      <header>
        <p className="text-xs font-medium text-muted">{copy.opportunities.branchOverview.header}</p>
        <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-foreground">{branch.name}</h2>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{branch.colonia}</span>
          <span className="inline-flex items-center gap-1"><Store className="size-3.5" aria-hidden />{ZONE_LABELS[branch.zoneType]}</span>
        </div>
      </header>

      <PanelSection
        title={copy.opportunities.branchOverview.priorityTitle}
        description={copy.opportunities.branchOverview.priorityDescription}
      >
        <div className="space-y-2" aria-busy={query.isPending}>
          {query.isPending ? (
            [0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[78px] rounded-block" />)
          ) : query.isError ? (
            <StatusMessage
              tone="error"
              title={copy.opportunities.branchOverview.errorTitle}
              description={copy.opportunities.branchOverview.errorDescription}
              action={
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => query.refetch()}>
                  {copy.opportunities.branchOverview.retry}
                </Button>
              }
            />
          ) : query.data?.length ? (
            query.data.map(({ product, prediction }) => {
              const risk = RISK_PRESENTATION[prediction.risk];
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                  className="group flex w-full items-center gap-3 rounded-block border border-line bg-card p-3 text-left transition hover:border-primary/40 hover:bg-primary-tint/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control" style={{ color: risk.color, backgroundColor: risk.softColor }}>
                    <Boxes className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{product.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                      <span>{copy.opportunities.unitsPerDay(formatInteger(prediction.predictedDailyDemand))}</span>
                      <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: risk.color }}>
                        <ArrowUpRight className="size-3" aria-hidden />{formatSignedPercent(prediction.upliftPct)}
                      </span>
                      <span>{risk.label}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-foreground">+{formatInteger(prediction.recommendedExtraUnits)}</span>
                    <span className="text-[10px] text-subtle">{copy.opportunities.branchOverview.suggested}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </button>
              );
            })
          ) : (
            <StatusMessage tone="empty" title={copy.opportunities.branchOverview.emptyTitle} description={copy.opportunities.branchOverview.emptyDescription} />
          )}
        </div>
      </PanelSection>
    </article>
  );
}
