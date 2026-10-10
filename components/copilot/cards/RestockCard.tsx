"use client";

import { useState } from "react";

import { formatInteger, formatLongDate, formatMoney, formatShortDate, formatUnits } from "@/lib/copilot/format";
import type { RestockPlan, RestockReason, RestockSuggestion } from "@/types/copilot";

import { CardShell } from "../ui/CardShell";

const REASON_LABEL: Record<RestockReason, string> = { stock_limit: "Stock limit", demand: "Demand", season: "Season" };

type ItemState = "pending" | "reviewing" | "approved" | "dismissed";

function SuggestionRow({ item }: { item: RestockSuggestion }) {
  const [state, setState] = useState<ItemState>("pending");
  const mailto = `mailto:${item.email_draft.to}?subject=${encodeURIComponent(item.email_draft.subject)}&body=${encodeURIComponent(item.email_draft.body)}`;

  return (
    <li className="rounded-xl border border-line px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {item.is_urgent ? (
              <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-critical px-2 py-0.5 text-xs font-semibold text-white">
                ▲ Urgent
              </span>
            ) : null}
            {formatInteger(item.suggested_qty)} × {item.product.product_name}
          </p>
          <p className="mt-0.5 text-sm text-ink-secondary">
            {item.supplier.supplier_name} · <span className="font-mono text-xs">{item.supplier.email}</span>
          </p>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Order today, arrives {formatShortDate(item.expected_arrival_date)} ({item.lead_time_days}-day lead time) ·{" "}
            {formatMoney(item.order_cost)}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{item.days_of_cover !== null ? `${formatUnits(item.days_of_cover)} days of cover` : "—"}</p>
          <p className="text-ink-muted">
            {formatInteger(item.on_hand)} on hand · {formatInteger(item.in_transit)} in transit
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.reasons.map((reason) => (
          <span key={reason} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-secondary">
            {REASON_LABEL[reason]}
          </span>
        ))}
      </div>
      <ul className="mt-1.5 list-disc pl-5 text-xs text-ink-secondary">
        {item.reason_details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>

      {state === "reviewing" ? (
        <div className="mt-3 rounded-lg bg-surface-muted p-3 text-xs">
          <p className="font-medium">To: {item.email_draft.to}</p>
          <p className="font-medium">Subject: {item.email_draft.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-ink-secondary">{item.email_draft.body}</pre>
          <div className="mt-3 flex gap-2">
            <a
              href={mailto}
              onClick={() => setState("approved")}
              className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Approve and open email
            </a>
            <button
              type="button"
              onClick={() => setState("pending")}
              className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
            >
              Back
            </button>
          </div>
        </div>
      ) : state === "pending" ? (
        <div className="mt-3 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setState("reviewing")}
            className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Review supplier email
          </button>
          <button
            type="button"
            onClick={() => setState("dismissed")}
            className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <p role="status" className={`mt-3 text-sm ${state === "approved" ? "text-good-ink" : "text-ink-muted"}`}>
          {state === "approved" ? "✓ Approved. Email prepared for the supplier." : "Dismissed."}
        </p>
      )}
    </li>
  );
}

export function RestockCard({ data }: { data: RestockPlan }) {
  return (
    <CardShell
      eyebrow="Suggestion · restock"
      title={`Restock for ${data.store.store_name}`}
      subtitle={`Checked ${data.checked_products} product(s) · ${formatLongDate(data.data_as_of)}`}
      footer="Helps you reduce losses. Supplier chosen by the best-supplier rule (margin, lead time, minimum order, reliability)."
    >
      {data.suggestions.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          {data.notes.length ? data.notes.join(" ") : "Nothing needs to be ordered today. Stock covers expected demand."}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.suggestions.map((item) => (
            <SuggestionRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </CardShell>
  );
}
