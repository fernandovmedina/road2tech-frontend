"use client";

import { copy } from "@/lib/copy";
import { formatDate, formatMoney } from "@/lib/format";
import { t } from "@/lib/labels";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { Strategy, StrategyStatus } from "@/types";

const L = copy.calendar.promoList;

const statusTone: Partial<Record<StrategyStatus, Tone>> = { selected: "orange", approved: "orange", scheduled: "orange", active: "green", measured: "gray" };

/** Sidebar list of the store's live promotions; picking one marks its bar in the Gantt. */
export function PromoList({
  strategies,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
}: {
  strategies: Strategy[] | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (error) return <ErrorState onRetry={onRetry} />;
  if (loading) return <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;

  const live = (strategies ?? [])
    .filter((s) => s.status !== "rejected" && s.status !== "expired")
    .sort((a, b) => a.period.start_date.localeCompare(b.period.start_date) || b.expected_margin_increment - a.expected_margin_increment);
  if (live.length === 0) return <EmptyState text={L.none} />;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-bold">{L.title}</h3>
      <ul className="flex flex-col gap-2">
        {live.map((s) => {
          const on = s.draft_id === selectedId;
          return (
            <li key={s.draft_id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(on ? null : s.draft_id)}
                className={`w-full rounded-block border p-3 text-left transition-colors ${on ? "border-accent bg-accent-tint/60" : "border-line bg-card hover:border-accent/60"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-snug">{s.title}</p>
                  <Badge tone={statusTone[s.status] ?? "gray"}>{t("strategyStatus", s.status)}</Badge>
                </div>
                <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
                  <span>
                    {formatDate(s.period.start_date)} – {formatDate(s.period.end_date)} · −{Math.round(s.proposed_discount_pct * 100)}%
                  </span>
                  <span className="font-bold text-primary">{L.gain} +{formatMoney(s.expected_margin_increment)}</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
