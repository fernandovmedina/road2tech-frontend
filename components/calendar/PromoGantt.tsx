"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { copy } from "@/lib/copy";
import { addDays, formatDate, formatMoney, parseIso } from "@/lib/format";
import { t } from "@/lib/labels";
import { calendarHref, productHref } from "@/lib/links";
import { Button } from "@/components/ui/Button";
import type { Strategy, StrategyStatus } from "@/types";

const G = copy.calendar.gantt;
const DAYS = 21; // visible window
const BEFORE = 5; // days shown before "today" when the window is not shifted
const SHIFT = 7; // days moved by the arrows

const navBtn = "flex h-11 w-11 items-center justify-center rounded-control border border-line bg-card text-lg hover:bg-background";

/** Whole days between two ISO dates (b - a). */
const diffDays = (a: string, b: string) => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);

/** Bar look by lifecycle: not approved yet = dashed outline, approved/scheduled = orange, running = green, measured = grey. */
const barStyle: Record<StrategyStatus, string> = {
  draft: "border-2 border-dashed border-accent bg-card text-accent-dark",
  selected: "border-2 border-dashed border-accent bg-accent-tint text-accent-dark",
  approved: "border border-accent bg-accent text-white",
  scheduled: "border border-accent bg-accent text-white",
  active: "border border-primary bg-primary text-white",
  measured: "border border-line bg-line text-foreground",
  expired: "border border-line bg-line text-muted",
  rejected: "border border-line bg-card text-muted line-through",
};
const LEGEND: { status: StrategyStatus; label: string }[] = [
  { status: "selected", label: G.legend.selected },
  { status: "approved", label: G.legend.approved },
  { status: "active", label: G.legend.active },
  { status: "measured", label: G.legend.measured },
];

function monthSegments(days: string[]) {
  const segs: { key: string; label: string; from: number; to: number }[] = [];
  days.forEach((iso, i) => {
    const d = parseIso(iso);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = segs[segs.length - 1];
    if (last && last.key === key) {
      last.to = i + 1;
      return;
    }
    const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(d);
    segs.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), from: i + 1, to: i + 1 });
  });
  return segs;
}

/**
 * Gantt of the store's promotions: one row per promotion, a bar over the days it runs, "hoy" highlighted.
 * All figures are the ones the backend sent; this only places them on a timeline.
 */
export function PromoGantt({
  strategies,
  asOf,
  storeId,
  selectedId,
  onSelect,
  nameOf,
}: {
  strategies: Strategy[];
  asOf: string;
  storeId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  nameOf: (productId: string) => string;
}) {
  const [shift, setShift] = useState(0);
  const first = addDays(asOf, -BEFORE + shift);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(first, i)), [first]);
  const last = days[DAYS - 1];
  const segs = useMemo(() => monthSegments(days), [days]);

  // Live promotions only (rejected or expired ones are not "on the calendar"), in the order they start.
  const rows = useMemo(
    () =>
      strategies
        .filter((s) => s.status !== "rejected" && s.status !== "expired")
        .sort((a, b) => a.period.start_date.localeCompare(b.period.start_date) || b.expected_margin_increment - a.expected_margin_increment),
    [strategies],
  );
  const selected = rows.find((s) => s.draft_id === selectedId) ?? null;
  const todayCol = diffDays(first, asOf);
  const template = { gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` } as const;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" aria-live="polite">{G.title}</h2>
          <p className="text-sm text-muted">{G.range(formatDate(first), formatDate(last))}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setShift(0)}>
            {copy.calendar.goToday}
          </Button>
          <button type="button" aria-label={G.prev} onClick={() => setShift((s) => s - SHIFT)} className={navBtn}>‹</button>
          <button type="button" aria-label={G.next} onClick={() => setShift((s) => s + SHIFT)} className={navBtn}>›</button>
        </div>
      </div>

      <ul className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-muted">
        {LEGEND.map((l) => (
          <li key={l.status} className="flex items-center gap-1.5">
            <span aria-hidden className={`h-3 w-5 rounded-sm ${barStyle[l.status]}`} />
            {l.label}
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="rounded-control bg-background px-3 py-4 text-sm text-muted">{G.empty}</p>
      ) : (
        <div className="relative overflow-x-auto rounded-block border border-line">
          <div className="min-w-[700px]" role="table" aria-label={G.title}>
            {/* header: months, then day numbers */}
            <div role="row" className="grid grid-cols-[200px_1fr] border-b border-line bg-background/60">
              <div role="columnheader" className="px-3 py-2 text-xs font-bold text-muted">{G.promotion}</div>
              <div>
                <div className="grid" style={template}>
                  {segs.map((m) => (
                    <div key={m.key} style={{ gridColumn: `${m.from} / ${m.to + 1}` }} className="truncate border-l border-line px-1.5 py-1 text-xs font-bold text-muted first:border-l-0">
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="grid" style={template}>
                  {days.map((iso, i) => {
                    const d = parseIso(iso);
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={iso}
                        className={`flex flex-col items-center py-1 text-[11px] leading-tight ${i === todayCol ? "bg-primary font-bold text-white" : weekend ? "bg-line text-muted" : "text-muted"}`}
                      >
                        <span className="font-bold">{d.getDate()}</span>
                        <span className="text-[9px] uppercase">{i === todayCol ? G.today : copy.calendar.weekdays[(d.getDay() + 6) % 7].slice(0, 1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {rows.map((s) => {
              const startCol = diffDays(first, s.period.start_date);
              const endCol = diffDays(first, s.period.end_date);
              const visible = endCol >= 0 && startCol <= DAYS - 1;
              const from = Math.max(0, startCol) + 1;
              const to = Math.min(DAYS - 1, endCol) + 2;
              const isSel = s.draft_id === selectedId;
              return (
                <div key={s.draft_id} role="row" className={`grid grid-cols-[200px_1fr] border-b border-line last:border-b-0 ${isSel ? "bg-accent-tint/30" : ""}`}>
                  <div role="rowheader" className="flex flex-col justify-center px-3 py-2">
                    <p className="line-clamp-2 text-sm font-bold leading-snug">{s.title}</p>
                    <p className="text-xs text-muted">
                      {t("strategyStatus", s.status)} · {formatDate(s.period.start_date)} – {formatDate(s.period.end_date)}
                    </p>
                  </div>
                  <div role="cell" className="relative grid min-h-[56px] items-center" style={template}>
                    {/* background: weekends and "today" */}
                    {days.map((iso, i) => {
                      const dow = parseIso(iso).getDay();
                      return (
                        <div
                          key={iso}
                          aria-hidden
                          style={{ gridColumn: i + 1, gridRow: 1 }}
                          className={`h-full border-l border-line/60 ${i === todayCol ? "bg-primary-tint" : dow === 0 || dow === 6 ? "bg-background" : ""}`}
                        />
                      );
                    })}
                    {visible ? (
                      <button
                        type="button"
                        onClick={() => onSelect(isSel ? null : s.draft_id)}
                        aria-pressed={isSel}
                        aria-label={`${s.title}, ${t("strategyStatus", s.status)}, ${formatDate(s.period.start_date)} – ${formatDate(s.period.end_date)}`}
                        title={s.title}
                        style={{ gridColumn: `${from} / ${to}`, gridRow: 1 }}
                        className={`z-10 mx-0.5 flex h-9 min-w-0 items-center gap-1.5 truncate rounded-control px-2 text-left text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${barStyle[s.status]} ${isSel ? "ring-2 ring-foreground" : ""}`}
                      >
                        <span className="shrink-0">−{Math.round(s.proposed_discount_pct * 100)}%</span>
                        {to - from >= 5 && <span className="truncate font-semibold opacity-90">+{formatMoney(s.expected_margin_increment)}</span>}
                      </button>
                    ) : (
                      <span style={{ gridColumn: "1 / -1", gridRow: 1 }} className="z-10 px-3 text-xs italic text-muted">{G.outOfRange}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <section aria-label={selected.title} className="mt-4 rounded-block bg-accent-tint/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-dark">{t("strategyType", selected.strategy_type)} · {t("strategyStatus", selected.status)}</p>
              <h3 className="text-base font-bold leading-snug">{selected.title}</h3>
              <p className="text-sm text-muted">
                {nameOf(selected.promoted_product_id)} · −{Math.round(selected.proposed_discount_pct * 100)}% · {formatDate(selected.period.start_date)} – {formatDate(selected.period.end_date)}
              </p>
            </div>
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-xs font-semibold text-muted">{G.detail.gain}</dt>
                <dd className="text-lg font-bold text-primary">+{formatMoney(selected.expected_margin_increment)}</dd>
              </div>
              {selected.expected_waste_reduction > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-muted">{G.detail.waste}</dt>
                  <dd className="text-lg font-bold">{formatMoney(selected.expected_waste_reduction)}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={productHref(selected.promoted_product_id, { storeId, strategyId: selected.draft_id })}
              className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {G.detail.viewAnalysis}
            </Link>
            <Link
              href={calendarHref({ storeId, productId: selected.promoted_product_id, date: selected.period.start_date })}
              className="inline-flex min-h-11 items-center rounded-control border border-line bg-card px-4 text-sm font-semibold hover:bg-background"
            >
              {G.detail.viewOrders}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
