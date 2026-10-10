"use client";

import Link from "next/link";
import { useState } from "react";
import { useBehaviors, type Scope } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney } from "@/lib/format";
import { calendarHref, productHref } from "@/lib/links";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { Behavior } from "@/types";

const B = copy.dashboard.behaviors;
const VISIBLE = 6;
const FETCHED = 12;

const kindTone: Record<Behavior["kind"], Tone> = { crosssell: "green", waste: "orange", demand: "blue" };
const sourceTone: Record<Behavior["source"], Tone> = { observed: "green", estimated: "gray" };
/** 24px outline icon paths: trend up (demand), clock (waste), plus (bought together). */
const kindIcon: Record<Behavior["kind"], string> = {
  demand: "M3 17l6-6 4 4 8-8M15 7h6v6",
  waste: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  crosssell: "M12 5v14M5 12h14",
};

// Navigation links styled like the standard buttons (Button renders a <button>, not an <a>).
const linkBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const linkPrimary = `${linkBase} bg-primary text-white hover:bg-primary-hover`;
const linkSecondary = `${linkBase} border border-line bg-card text-foreground hover:bg-background`;

function KindIcon({ kind }: { kind: Behavior["kind"] }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d={kindIcon[kind]} />
    </svg>
  );
}

/** One action per card: the promotion that answers it, the suggested order, or the calendar when there is nothing else. */
function actionOf(b: Behavior, storeId: string): { label: string; href: string; primary: boolean } {
  if (b.kind === "demand") {
    // Straight to the order of that product when the backend has one; otherwise the calendar, without promising an order.
    if (b.restock_suggestion_id) {
      return { label: B.actions.demand, href: calendarHref({ productId: b.product_id, storeId, orderId: b.restock_suggestion_id }), primary: false };
    }
    return { label: copy.common.viewInCalendar, href: calendarHref({ productId: b.product_id, storeId }), primary: false };
  }
  if (b.strategy_id) {
    return { label: B.actions[b.kind], href: productHref(b.product_id, { storeId, strategyId: b.strategy_id }), primary: true };
  }
  return { label: copy.common.viewInCalendar, href: calendarHref({ productId: b.product_id, storeId }), primary: false };
}

function BehaviorCard({ behavior: b, storeId }: { behavior: Behavior; storeId: string }) {
  const action = actionOf(b, storeId);
  return (
    <li>
      <Card className="flex h-full flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={kindTone[b.kind]}>
            <KindIcon kind={b.kind} />
            {B.tags[b.kind]}
          </Badge>
          <Badge tone={sourceTone[b.source]}>{B.sources[b.source]}</Badge>
        </div>
        <p className="text-2xl font-bold tabular-nums text-primary" title={B.possibleHint}>{B.possible(formatMoney(b.estimated_gain_mxn))}</p>
        <h3 className="line-clamp-2 text-base font-bold leading-snug">{b.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{b.text}</p>
        <div className="pt-2">
          <Link href={action.href} className={action.primary ? linkPrimary : linkSecondary}>{action.label}</Link>
        </div>
      </Card>
    </li>
  );
}

const grid = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";

/** "Comportamientos de compra detectados": demand peaks, waste risk and products bought together, at most six at a glance. */
export function BehaviorCards({ scope, storeId }: { scope: Scope; storeId: string }) {
  const { data, isPending, isError, refetch } = useBehaviors(storeId, scope, FETCHED);
  const [expanded, setExpanded] = useState(false);
  const extra = (data?.length ?? 0) - VISIBLE;
  const shown = expanded ? data : data?.slice(0, VISIBLE);

  return (
    <section aria-labelledby="behaviors-title" className="flex flex-col gap-4">
      <div>
        <h2 id="behaviors-title" className="text-lg font-bold">{B.title}</h2>
        <p className="mt-1 text-sm text-muted">{B.subtitle}</p>
      </div>
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isPending ? (
        <div className={grid} aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-card" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className={grid}>
            {shown?.map((b) => <BehaviorCard key={b.id} behavior={b} storeId={storeId} />)}
          </ul>
          {extra > 0 && (
            <div>
              <Button variant="secondary" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
                {expanded ? B.showLess : B.showMore(extra)}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
