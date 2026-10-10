"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { copy } from "@/lib/copy";
import { formatRange, formatSignedMoney, formatUnits } from "@/lib/copilot/format";
import type { ApprovalDecision, ApprovalRequest } from "@/types/copilot";

import { RiskBadge } from "../ui/RiskBadge";

const A = copy.copilot.approval;

type ApprovalCardProps = { request: ApprovalRequest; onDecide: (decision: ApprovalDecision) => void };

/**
 * Human-in-the-loop step: the LangGraph run is paused until the manager decides. "Aprobar" never resumes the agent by
 * itself: it opens a confirmation dialog first, and only its explicit "Sí, aprobar" sends the decision.
 */
export function ApprovalCard({ request, onDecide }: ApprovalCardProps) {
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<ApprovalDecision["decision"] | null>(null);

  const decide = (decision: ApprovalDecision["decision"]) => {
    setConfirming(false);
    setSent(decision);
    onDecide({ decision, note: note.trim() || undefined });
  };
  const range = formatRange(request.valid_from, request.valid_to);
  const discount = `${formatUnits(request.discount_pct)}%`;

  return (
    <section aria-label={A.ariaLabel} className="my-2 w-full rounded-card border-2 border-primary bg-card px-5 py-4 text-foreground">
      <p className="text-xs font-medium tracking-wide text-primary">
        <span className="uppercase">{A.eyebrow}</span> · <span className="font-mono">{request.draft_id}</span>
      </p>
      <h3 className="mt-1 text-base font-semibold">{request.title}</h3>
      <p className="mt-0.5 text-sm text-muted">
        {request.product_name} · {request.store_name} · {range}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-background px-2.5 py-1">
          {A.netImpact} <strong>{formatSignedMoney(request.expected_net_impact)}</strong> ({formatSignedMoney(request.confidence_low)} a{" "}
          {formatSignedMoney(request.confidence_high)})
        </span>
        <span className="rounded-full bg-background px-2.5 py-1">
          {A.sales} <strong>{formatSignedMoney(request.expected_sales_increment)}</strong>
        </span>
        <span className="rounded-full bg-background px-2.5 py-1">{A.wasteAvoided(formatUnits(request.expected_waste_reduction))}</span>
        <RiskBadge label={copy.copilot.risk.runOut} level={request.stockout_risk} />
      </div>

      {sent ? (
        <p role="status" className="mt-3 text-sm text-muted">
          {A.sending[sent]}
        </p>
      ) : (
        <>
          <label className="mt-3 block text-sm">
            <span className="text-muted">{A.noteLabel}</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              placeholder={A.notePlaceholder}
              className="mt-1 min-h-11 w-full rounded-control border border-line bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setConfirming(true)}>{A.approve}</Button>
            <Button variant="secondary" onClick={() => decide("reject")}>
              {A.reject}
            </Button>
            <Button variant="ghost" onClick={() => decide("later")}>
              {A.later}
            </Button>
          </div>
        </>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={A.confirmTitle}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {A.cancel}
            </Button>
            <Button onClick={() => decide("approve")}>{A.confirmYes}</Button>
          </>
        }
      >
        <p className="text-sm text-muted">{A.confirmText(request.product_name, discount, range)}</p>
      </Modal>
    </section>
  );
}
