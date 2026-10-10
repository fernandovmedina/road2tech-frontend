"use client";

import { useState } from "react";

import { formatRange, formatSignedMoney, formatUnits } from "@/lib/copilot/format";
import type { ApprovalDecision, ApprovalRequest } from "@/types/copilot";

import { RiskBadge } from "../ui/RiskBadge";

type ApprovalCardProps = { request: ApprovalRequest; onDecide: (decision: ApprovalDecision) => void };

/** Human-in-the-loop step: the LangGraph run is paused until the manager decides. */
export function ApprovalCard({ request, onDecide }: ApprovalCardProps) {
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<ApprovalDecision["decision"] | null>(null);

  const decide = (decision: ApprovalDecision["decision"]) => {
    setSent(decision);
    onDecide({ decision, note: note.trim() || undefined });
  };

  return (
    <section
      aria-label="Approve promotion draft"
      className="my-2 w-full rounded-2xl border-2 border-accent bg-surface px-5 py-4 text-ink"
    >
      <p className="text-xs font-medium tracking-wide text-accent">
        <span className="uppercase">Approval needed</span> · <span className="font-mono">{request.draft_id}</span>
      </p>
      <h3 className="mt-1 text-base font-semibold">{request.title}</h3>
      <p className="mt-0.5 text-sm text-ink-secondary">
        {request.product_name} · {request.store_name} · {formatRange(request.valid_from, request.valid_to)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-surface-muted px-2.5 py-1">
          Net impact <strong>{formatSignedMoney(request.expected_net_impact)}</strong> (
          {formatSignedMoney(request.confidence_low)} to {formatSignedMoney(request.confidence_high)})
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-1">
          Sales <strong>{formatSignedMoney(request.expected_sales_increment)}</strong>
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-1">
          Waste avoided <strong>{formatUnits(request.expected_waste_reduction)} units</strong>
        </span>
        <RiskBadge label="Run-out risk" level={request.stockout_risk} />
      </div>

      {sent ? (
        <p role="status" className="mt-3 text-sm text-ink-secondary">
          {sent === "approve" ? "Approving…" : sent === "reject" ? "Rejecting…" : "Keeping as draft…"}
        </p>
      ) : (
        <>
          <label className="mt-3 block text-sm">
            <span className="text-ink-secondary">Note (optional)</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              placeholder="e.g. Approved for the weekend only"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => decide("approve")}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Approve promotion
            </button>
            <button
              type="button"
              onClick={() => decide("reject")}
              className="rounded-lg border border-line px-4 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => decide("later")}
              className="rounded-lg px-4 py-2 text-ink-secondary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
            >
              Keep as draft
            </button>
          </div>
        </>
      )}
    </section>
  );
}
