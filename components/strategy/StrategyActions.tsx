"use client";

import Link from "next/link";
import { useState } from "react";
import { useAddToPlan, useApproveStrategy, useRejectStrategy, useStorePlan } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/envelope";
import { copy } from "@/lib/copy";
import { formatDate, formatSignedMoney } from "@/lib/format";
import { calendarHref, productHref } from "@/lib/links";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { discountLabel, intervalText } from "./strategyFormat";
import type { Strategy, StrategyAction } from "@/types";

const A = copy.strategy.actions;
const Q = copy.product.accept;
const linkClass =
  "inline-flex min-h-11 items-center rounded-control border border-line bg-card px-4 text-sm font-semibold hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Figures the confirmation dialog shows when they differ from the strategy's own (e.g. the discount chosen on a slider). */
type Estimate = { marginIncrement: number; interval: Strategy["confidence_interval"] };

/**
 * Lifecycle actions for one strategy. The backend decides every transition; this only enables the buttons that make
 * sense for the current status. Accepting always asks for confirmation first. `onChanged` receives the updated
 * strategy returned by the backend.
 *
 * - `discountPct` (fraction): discount chosen by the user; it is sent when adding to the plan or approving.
 * - `estimate`: the gain/range for that discount, shown in the confirmation dialog.
 * - `variant="promo"` (promotion detail): one "Aceptar promoción" button that, from a draft, adds it to the plan and
 *   approves it after a single confirmation; otherwise the plan lifecycle buttons are used.
 */
export function StrategyActions({
  strategy,
  onChanged,
  showDetailLink = true,
  discountPct,
  estimate,
  variant = "plan",
}: {
  strategy: Strategy;
  onChanged?: (next: Strategy) => void;
  showDetailLink?: boolean;
  discountPct?: number;
  estimate?: Estimate;
  variant?: "plan" | "promo";
}) {
  const add = useAddToPlan();
  const approve = useApproveStrategy();
  const reject = useRejectStrategy();
  const plan = useStorePlan(strategy.store_id);
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = add.isPending || approve.isPending || reject.isPending;
  const id = strategy.draft_id;
  const promo = variant === "promo";
  const arg = discountPct === undefined ? id : { draftId: id, discountPct };

  const done = (result: StrategyAction, message: string) => {
    setError(null);
    onChanged?.(result.strategy);
    toast.show(message);
  };
  const fail = (e: unknown) => {
    // The backend rejects transitions that are no longer valid (for example another user already changed it).
    setError(e instanceof ApiError && e.kind === "server" ? copy.strategy.errors.transition : copy.strategy.errors.generic);
    setConfirming(false);
    void plan.refetch();
  };

  const onAdd = () => add.mutate(arg, { onSuccess: (r) => done(r, A.addedToast), onError: fail });
  const onReject = (message: string) => reject.mutate(id, { onSuccess: (r) => done(r, message), onError: fail });
  const onApprove = async () => {
    try {
      // A draft first goes into the plan (same chosen discount), then it is approved: two valid backend transitions.
      if (promo && strategy.status === "draft") onChanged?.((await add.mutateAsync(arg)).strategy);
      const result = await approve.mutateAsync(arg);
      setConfirming(false);
      done(result, promo ? Q.toast : A.approvedToast);
    } catch (e) {
      fail(e);
    }
  };

  const { status } = strategy;
  const changeable = status === "draft" || status === "selected";
  const shownDiscount = discountPct ?? strategy.proposed_discount_pct;
  const shown = estimate ?? { marginIncrement: strategy.expected_margin_increment, interval: strategy.confidence_interval };
  const acting = add.isPending || approve.isPending;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {promo && changeable && (
          <>
            <Button onClick={() => setConfirming(true)} disabled={busy}>{Q.button}</Button>
            <Button variant="secondary" onClick={() => onReject(Q.discardedToast)} disabled={busy}>{A.discard}</Button>
          </>
        )}
        {!promo && status === "draft" && (
          <>
            <Button onClick={onAdd} disabled={busy}>{add.isPending ? A.working : A.addToPlan}</Button>
            <Button variant="secondary" onClick={() => onReject(A.discardedToast)} disabled={busy}>{A.discard}</Button>
          </>
        )}
        {!promo && status === "selected" && (
          <>
            <Button onClick={() => setConfirming(true)} disabled={busy}>{A.approve}</Button>
            <Button variant="secondary" onClick={() => onReject(A.rejectedToast)} disabled={busy}>{A.reject}</Button>
            <Button variant="ghost" onClick={() => onReject(A.removedToast)} disabled={busy}>{A.removeFromPlan}</Button>
          </>
        )}
        {showDetailLink && (
          <Link
            href={productHref(strategy.promoted_product_id, { storeId: strategy.store_id, strategyId: id })}
            className={linkClass}
          >
            {A.viewDetail}
          </Link>
        )}
        <Link
          href={calendarHref({ productId: strategy.promoted_product_id, date: strategy.period.start_date, storeId: strategy.store_id })}
          className={linkClass}
        >
          {copy.common.viewInCalendar}
        </Link>
      </div>
      {!changeable && (status === "approved" || status === "scheduled" || status === "active") && (
        <p className="text-xs text-muted">{promo ? Q.locked : A.locked}</p>
      )}
      {error && (
        <p role="alert" className="rounded-block bg-alert-tint px-3 py-2 text-sm font-medium text-alert-dark">{error}</p>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={promo ? Q.dialogTitle : copy.strategy.approveDialog.title}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={acting}>{copy.common.cancel}</Button>
            <Button onClick={() => void onApprove()} disabled={acting}>
              {acting ? A.working : promo ? Q.confirm : copy.strategy.approveDialog.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm font-bold">{strategy.title}</p>
        <p className="mt-2 text-sm leading-relaxed">
          {(promo ? Q.dialogText : copy.strategy.approveDialog.text)(
            discountLabel(shownDiscount),
            formatDate(strategy.period.start_date),
            formatDate(strategy.period.end_date),
          )}
        </p>
        <p className="mt-3 text-sm">
          {promo ? (
            <>
              <span className="text-muted">{Q.gain} </span>
              <span className="font-bold text-primary">{formatSignedMoney(shown.marginIncrement)}</span>
            </>
          ) : (
            <>
              <span className="font-bold text-primary">≈ {formatSignedMoney(shown.marginIncrement)}</span>{" "}
              <span className="text-muted">{copy.strategy.approveDialog.estimate} · {intervalText(shown.interval)}</span>
            </>
          )}
        </p>
        <p className="mt-3 text-xs text-muted">{promo ? Q.note : copy.strategy.approveDialog.note}</p>
      </Modal>
    </div>
  );
}
