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
const linkClass =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line bg-white px-4 text-sm font-semibold hover:bg-background";

/**
 * Lifecycle actions for one strategy. The backend decides every transition; this only enables the buttons that make
 * sense for the current status. Approving always asks for confirmation first. `onChanged` receives the updated
 * strategy returned by the backend.
 */
export function StrategyActions({
  strategy,
  onChanged,
  showDetailLink = true,
}: {
  strategy: Strategy;
  onChanged?: (next: Strategy) => void;
  showDetailLink?: boolean;
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

  const onAdd = () => add.mutate(id, { onSuccess: (r) => done(r, A.addedToast), onError: fail });
  const onReject = (message: string) => reject.mutate(id, { onSuccess: (r) => done(r, message), onError: fail });
  const onApprove = () =>
    approve.mutate(id, {
      onSuccess: (r) => {
        setConfirming(false);
        done(r, A.approvedToast);
      },
      onError: fail,
    });

  const { status } = strategy;
  const changeable = status === "draft" || status === "selected";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && (
          <>
            <Button onClick={onAdd} disabled={busy}>{add.isPending ? A.working : A.addToPlan}</Button>
            <Button variant="secondary" onClick={() => onReject(A.discardedToast)} disabled={busy}>{A.discard}</Button>
          </>
        )}
        {status === "selected" && (
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
        <p className="text-xs text-muted">{A.locked}</p>
      )}
      {error && (
        <p role="alert" className="rounded-[10px] bg-alert-tint px-3 py-2 text-sm font-medium text-alert-dark">{error}</p>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={copy.strategy.approveDialog.title}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={approve.isPending}>{copy.common.cancel}</Button>
            <Button onClick={onApprove} disabled={approve.isPending}>
              {approve.isPending ? A.working : copy.strategy.approveDialog.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm font-bold">{strategy.title}</p>
        <p className="mt-2 text-sm leading-relaxed">
          {copy.strategy.approveDialog.text(
            discountLabel(strategy.proposed_discount_pct),
            formatDate(strategy.period.start_date),
            formatDate(strategy.period.end_date),
          )}
        </p>
        <p className="mt-3 text-sm">
          <span className="font-bold text-primary">≈ {formatSignedMoney(strategy.expected_margin_increment)}</span>{" "}
          <span className="text-muted">{copy.strategy.approveDialog.estimate} · {intervalText(strategy.confidence_interval)}</span>
        </p>
        <p className="mt-3 text-xs text-muted">{copy.strategy.approveDialog.note}</p>
      </Modal>
    </div>
  );
}
