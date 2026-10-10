import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/lib/copy";
import { OpportunityMapFrame } from "./OpportunityMapFrame";

export function OpportunityMapSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <OpportunityMapFrame>
      <p className="sr-only" role="status">
        {copy.opportunities.loading}
      </p>
      <div className="grid gap-3 md:grid-cols-[minmax(13rem,1fr)_minmax(12rem,1fr)_minmax(10rem,.75fr)_minmax(10rem,.75fr)]">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-10 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[5.25rem] rounded-card" />
        ))}
      </div>
      <div className={`grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem] ${embedded ? "xl:min-h-[560px]" : "xl:h-[calc(100dvh-15.5rem)] xl:min-h-[600px]"}`}>
        <div className="flex min-h-0 flex-col gap-3">
          <Skeleton className="min-h-[26rem] flex-1 rounded-card" />
          <Skeleton className="h-[5.5rem] shrink-0 rounded-card" />
        </div>
        <Skeleton className="min-h-[26rem] rounded-card" />
      </div>
    </OpportunityMapFrame>
  );
}
