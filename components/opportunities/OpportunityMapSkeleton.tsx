import { Skeleton } from "@/components/ui/Skeleton";
import { OpportunityMapFrame } from "./OpportunityMapFrame";

export function OpportunityMapSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <OpportunityMapFrame embedded={embedded} controls={<Skeleton className="h-10 w-[30rem] max-w-full rounded-xl" />}>
      <p className="sr-only" role="status">
        Loading the demand opportunity map…
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[5.25rem] rounded-xl" />
        ))}
      </div>
      <div className={`grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem] ${embedded ? "xl:min-h-[560px]" : "xl:h-[calc(100dvh-15.5rem)] xl:min-h-[600px]"}`}>
        <div className="flex min-h-0 flex-col gap-3">
          <Skeleton className="min-h-[26rem] flex-1 rounded-xl" />
          <Skeleton className="h-[5.5rem] shrink-0 rounded-xl" />
        </div>
        <Skeleton className="min-h-[26rem] rounded-xl" />
      </div>
    </OpportunityMapFrame>
  );
}
