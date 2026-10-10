"use client";

import { useState } from "react";
import { useAsOf, useCatalog, useSendEmail, useStores, useSuppliers } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { buildOrderEmail } from "@/lib/emailTemplates";
import { formatDate, formatMoney, formatMoneyExact, formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import { useMailRecipient } from "@/lib/mailSettings";
import { useSentOrders } from "@/lib/sentOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { MailRecipientField } from "@/components/ui/MailRecipientField";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { RestockSuggestion } from "@/types";

const M = copy.calendar.modal;

type Choice = {
  supplierId: string;
  name: string;
  email: string | null;
  unitCost: number;
  minOrderQty: number;
  leadTimeDays: number;
  expectedDelivery: string;
  suggestedQty: number;
  estimatedCost: number;
  isPrimary: boolean;
};

// Keyed by suggestion so the local state (supplier, quantity, step) resets without an effect.
export function OrderModal({ suggestion, onClose }: { suggestion: RestockSuggestion | null; onClose: () => void }) {
  return <OrderForm key={suggestion?.id ?? "none"} suggestion={suggestion} onClose={onClose} />;
}

function OrderForm({ suggestion, onClose }: { suggestion: RestockSuggestion | null; onClose: () => void }) {
  const asOf = useAsOf();
  const stores = useStores();
  const suppliers = useSuppliers();
  const catalog = useCatalog();
  const send = useSendEmail();
  const { recipient } = useMailRecipient();
  const sentOrders = useSentOrders();
  const toast = useToast();

  const [supplierId, setSupplierId] = useState(suggestion?.supplier.supplier_id ?? "");
  // null = follow the quantity the backend suggests for the chosen supplier; a string = what the user typed.
  const [qtyText, setQtyText] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!suggestion) return <Modal open={false} onClose={onClose} title={M.title}>{null}</Modal>;

  const primary: Choice = {
    supplierId: suggestion.supplier.supplier_id,
    name: suggestion.supplier.supplier_name,
    email: suggestion.supplier.email,
    unitCost: suggestion.supplier.unit_cost,
    minOrderQty: suggestion.supplier.min_order_qty,
    leadTimeDays: suggestion.supplier.lead_time_days,
    expectedDelivery: suggestion.expected_delivery_date,
    suggestedQty: suggestion.suggested_qty,
    estimatedCost: suggestion.estimated_cost,
    isPrimary: true,
  };
  const alternatives: Choice[] = suggestion.alternatives.map((a) => ({
    supplierId: a.supplier_id,
    name: a.supplier_name,
    // Alternatives do not carry an e-mail: it comes from the supplier catalog.
    email: suppliers.data?.find((s) => s.supplier_id === a.supplier_id)?.email ?? null,
    unitCost: a.unit_cost,
    minOrderQty: a.min_order_qty,
    leadTimeDays: a.lead_time_days,
    expectedDelivery: a.expected_delivery_date,
    suggestedQty: a.suggested_qty,
    estimatedCost: a.estimated_cost,
    isPrimary: false,
  }));
  const choices = [primary, ...alternatives];
  const choice = choices.find((c) => c.supplierId === supplierId) ?? primary;

  const edited = qtyText !== null;
  const qty = edited ? (qtyText.trim() === "" ? Number.NaN : Number(qtyText)) : choice.suggestedQty;
  const qtyError = !Number.isInteger(qty) || qty <= 0
    ? M.qtyInvalid
    : qty < choice.minOrderQty
      ? M.qtyBelowMin(formatNumber(choice.minOrderQty))
      : undefined;
  // Backend estimate for the suggested quantity; qty x unit cost only when the user edited the quantity.
  const cost = edited && !qtyError ? qty * choice.unitCost : choice.estimatedCost;

  const productName = catalog.nameOf(suggestion.product_id);
  const store = stores.data?.find((s) => s.store_id === suggestion.store_id);
  const branchName = store ? displayBranchName(store) : suggestion.store_id;
  const when = suggestion.order_date === asOf ? M.today : M.onDate(formatDate(suggestion.order_date));
  const qtyLabel = Number.isFinite(qty) ? formatNumber(qty) : "—";
  const sent = send.data;
  const blocked = !!qtyError;

  function pickSupplier(id: string) {
    setSupplierId(id);
    setQtyText(null); // new supplier: the backend's suggested quantity for that offer
  }

  function submit() {
    if (blocked || !suggestion) return;
    const body = buildOrderEmail({
      brand: branchName,
      supplierName: choice.name,
      supplierEmail: choice.email,
      productName,
      productId: suggestion.product_id,
      qty,
      unitCost: choice.unitCost,
      totalCost: cost,
      orderDate: suggestion.order_date,
      expectedDelivery: choice.expectedDelivery,
    });
    send.mutate(
      { to: recipient, subject: M.subjectValue(productName, branchName), fromName: branchName, ...body },
      {
        onSuccess: (res) => {
          // Remember the order so this suggestion is not offered again (and not sent twice).
          sentOrders.add({
            suggestionId: suggestion.id,
            storeId: suggestion.store_id,
            productId: suggestion.product_id,
            supplierId: choice.supplierId,
            qty,
            orderDate: suggestion.order_date,
            expectedDelivery: choice.expectedDelivery,
            sentAt: res.sent_at,
            to: res.email.to,
          });
          toast.show(M.sentTitle);
        },
      },
    );
  }

  function backToForm() {
    send.reset();
    setConfirming(false);
  }

  let footer;
  if (sent) {
    footer = <Button onClick={onClose}>{copy.common.close}</Button>;
  } else if (confirming) {
    footer = (
      <>
        <Button variant="secondary" onClick={backToForm} disabled={send.isPending}>{M.back}</Button>
        <Button onClick={submit} disabled={send.isPending}>
          {send.isPending ? M.sending : send.isError ? copy.common.retry : M.confirmSend}
        </Button>
      </>
    );
  } else {
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>{copy.common.cancel}</Button>
        <Button onClick={() => setConfirming(true)} disabled={blocked}>{M.send}</Button>
      </>
    );
  }

  return (
    <Modal open onClose={onClose} title={M.title} footer={footer} width="max-w-2xl">
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-2xl text-primary">✓</span>
          <p className="text-lg font-extrabold">{M.sentTitle}</p>
          <p className="max-w-sm text-sm text-muted">{M.sentText(sent.email.to)}</p>
          <p className="text-sm font-bold">{M.arrival(formatDate(choice.expectedDelivery))}</p>
          <p className="text-xs text-muted">
            {qtyLabel} {copy.common.units} · {formatMoney(cost)}
          </p>
        </div>
      ) : confirming ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-extrabold">{M.confirmTitle}</h3>
            <p className="mt-1 text-sm text-muted">{M.confirmText(qtyLabel, choice.name, recipient)}</p>
          </div>
          <dl className="grid gap-x-4 gap-y-2 rounded-xl bg-background p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted">{M.to}</dt><dd className="break-all font-semibold">{recipient}</dd></div>
            <div><dt className="text-xs text-muted">{M.supplier}</dt><dd className="font-semibold">{choice.name}</dd></div>
            <div><dt className="text-xs text-muted">{M.qty}</dt><dd className="font-semibold">{qtyLabel}</dd></div>
            <div><dt className="text-xs text-muted">{M.cost}</dt><dd className="font-semibold">{formatMoney(cost)}</dd></div>
          </dl>
          {send.isError && (
            <div role="alert" className="rounded-xl border border-alert/30 bg-alert-tint p-3">
              <p className="text-sm font-bold text-alert-dark">{M.errorTitle}</p>
              <p className="text-sm text-alert-dark/80">{M.errorText}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{M.approval}</p>

          <div
            className={`rounded-xl border p-4 ${suggestion.is_urgent ? "border-alert/40 bg-alert-tint" : "border-line bg-background"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {suggestion.is_urgent && <Badge tone="red">{t("restockReason", "urgent")}</Badge>}
              {suggestion.reasons.map((r) => <Badge key={r} tone="gray">{t("restockReason", r)}</Badge>)}
            </div>
            <p className={`mt-2 text-base font-extrabold ${suggestion.is_urgent ? "text-alert-dark" : ""}`}>
              {M.orderMessage(qtyLabel, choice.name, productName, when, formatDate(choice.expectedDelivery))}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MailRecipientField id="order-to" label={M.to} showHint={false} />
            <Field id="order-subject" label={M.subject} value={M.subjectValue(productName, branchName)} readOnly />
          </div>
          <p className="-mt-2 text-xs text-muted">
            {choice.email ? M.toNote(choice.email) : null} {M.subjectNote}
          </p>

          <div className="flex flex-col gap-1">
            {choices.length > 1 ? (
              <Select id="order-supplier" label={M.supplier} value={choice.supplierId} onChange={(e) => pickSupplier(e.target.value)}>
                {choices.map((c) => (
                  <option key={c.supplierId} value={c.supplierId}>{M.supplierOption(c.name, c.isPrimary)}</option>
                ))}
              </Select>
            ) : (
              <Field id="order-supplier" label={M.supplier} value={choice.name} readOnly />
            )}
            <p className="text-xs text-muted">
              {M.supplierFacts(
                formatMoneyExact(choice.unitCost),
                formatNumber(choice.minOrderQty),
                M.leadDays(choice.leadTimeDays),
                formatDate(choice.expectedDelivery),
              )}
            </p>
          </div>

          <div className="grid items-start gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Field
                id="order-qty"
                label={M.qty}
                type="number"
                inputMode="numeric"
                min={choice.minOrderQty}
                step={1}
                value={edited ? qtyText : String(choice.suggestedQty)}
                error={qtyError}
                onChange={(e) => setQtyText(e.target.value)}
              />
              {edited && (
                <button type="button" onClick={() => setQtyText(null)} className="min-h-11 self-start text-xs font-bold text-primary hover:underline">
                  {M.qtyReset} ({formatNumber(choice.suggestedQty)})
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">{M.cost}</span>
              <p className="flex min-h-11 items-center text-lg font-extrabold">{formatMoney(cost)}</p>
              <span className="text-xs text-muted">{edited && !qtyError ? M.costEdited : M.costBackend}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-alert/30 bg-alert-tint p-4">
              <p className="text-sm font-bold text-alert-dark">{M.skip}</p>
              <p className="mt-2 text-xs text-alert-dark/80">{M.lostSales}</p>
              <p className="text-xl font-extrabold text-alert-dark">−{formatMoney(suggestion.expected_lost_sales_if_skipped)}</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary-tint p-4">
              <p className="text-sm font-bold text-primary">{M.order}</p>
              <p className="mt-2 text-xs text-primary/80">{M.expectedGain}</p>
              <p className="text-xl font-extrabold text-primary">+{formatMoney(suggestion.expected_gain_if_ordered)}</p>
              <p className="mt-1 text-xs text-primary/80">{M.waste}: {formatMoney(suggestion.expected_waste_if_ordered)}</p>
            </div>
          </div>
          {edited && <p className="-mt-2 text-xs text-muted">{M.scenarioNote}</p>}
        </div>
      )}
    </Modal>
  );
}
