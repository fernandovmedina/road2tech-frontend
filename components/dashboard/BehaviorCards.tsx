"use client";

import Link from "next/link";
import { useBehaviors, type Scope } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";
import { calendarHref, productHref } from "@/lib/links";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { Behavior } from "@/types";

const B = copy.dashboard.behaviors;
const kindTone: Record<Behavior["kind"], Tone> = { crosssell: "green", waste: "orange", demand: "blue" };
const sourceTone: Record<Behavior["source"], Tone> = { observed: "green", estimated: "gray" };

const linkBtn = "inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-sm font-semibold transition-colors";

function ticketShare(b: Behavior): { share: number; sample: number | null } | null {
  const a = b.affinity;
  if (!a) return null;
  const share = b.source === "observed" ? a.observed_ticket_share : a.estimated_ticket_share;
  return share == null ? null : { share, sample: a.tickets_sample };
}

export function BehaviorCards({ scope, storeId }: { scope: Scope; storeId: string }) {
  const { data, isPending, isError, refetch } = useBehaviors(storeId, scope);

  return (
    <section aria-labelledby="behaviors-title">
      <h2 id="behaviors-title" className="mb-3 text-lg font-extrabold">{B.title}</h2>
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {data.map((b) => {
            const affinity = ticketShare(b);
            return (
              <Card key={b.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={kindTone[b.kind]}>{B.tags[b.kind]}</Badge>
                    <Badge tone={sourceTone[b.source]}>{B.sources[b.source]}</Badge>
                  </div>
                  <span className="text-sm font-extrabold tabular-nums text-primary" title={B.estimatedGain}>+{formatMoney(b.estimated_gain_mxn)}</span>
                </div>
                <h3 className="text-base font-extrabold leading-snug">{b.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted">{b.text}</p>
                {affinity && (
                  <p className="text-xs font-semibold text-muted">
                    {B.ticketShare(formatPct(affinity.share, affinity.share < 0.01 ? 2 : affinity.share < 0.1 ? 1 : 0))}
                    {affinity.sample != null && <> · {B.ticketsSample(formatNumber(affinity.sample))}</>}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={productHref(b.product_id, { storeId })} className={`${linkBtn} bg-primary text-white hover:bg-primary-hover`}>{B.viewPrediction}</Link>
                  <Link href={calendarHref({ productId: b.product_id, storeId })} className={`${linkBtn} border border-line bg-white hover:bg-background`}>{copy.common.viewInCalendar}</Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
