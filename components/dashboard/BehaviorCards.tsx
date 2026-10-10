"use client";

import Link from "next/link";
import { useBehaviors, type Scope } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney } from "@/lib/format";
import { calendarHref, productHref } from "@/lib/links";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";

const B = copy.dashboard.behaviors;
const tone: Record<string, Tone> = { crosssell: "green", waste: "orange", demand: "blue" };

const linkBtn = "inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-sm font-semibold transition-colors";

export function BehaviorCards({ scope }: { scope: Scope }) {
  const { data, isPending, isError, refetch } = useBehaviors(scope);

  return (
    <section aria-labelledby="behaviors-title">
      <h2 id="behaviors-title" className="mb-3 text-lg font-extrabold">{B.title}</h2>
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {data.map((b) => (
            <Card key={b.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge tone={tone[b.kind]}>{B.tags[b.kind]}</Badge>
                <span className="text-sm font-extrabold text-primary">+{formatMoney(b.estimatedGain)}</span>
              </div>
              <h3 className="text-base font-extrabold leading-snug">{b.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-muted">{b.text}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={productHref(b.productId)} className={`${linkBtn} bg-primary text-white hover:bg-primary-hover`}>{B.viewPrediction}</Link>
                <Link href={calendarHref({ productId: b.productId })} className={`${linkBtn} border border-line bg-white hover:bg-background`}>{copy.common.viewInCalendar}</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
