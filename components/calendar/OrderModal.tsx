"use client";

import { useMemo, useState } from "react";
import { useBranches, useProducts, useSendOrder, useSuppliers } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { RestockSuggestion } from "@/types";

const M = copy.calendar.modal;

// Keyed by suggestion so local state (qty, sent) resets without an effect.
export function OrderModal({ suggestion, onClose }: { suggestion: RestockSuggestion | null; onClose: () => void }) {
  return <OrderForm key={suggestion?.id ?? "none"} suggestion={suggestion} onClose={onClose} />;
}

function OrderForm({ suggestion, onClose }: { suggestion: RestockSuggestion | null; onClose: () => void }) {
  const products = useProducts().data ?? [];
  const suppliers = useSuppliers().data ?? [];
  const branches = useBranches().data ?? [];
  const send = useSendOrder();
  const toast = useToast();
  const [qty, setQty] = useState(suggestion?.suggestedQty ?? 0);
  const [sent, setSent] = useState(false);

  const product = products.find((p) => p.id === suggestion?.productId);
  const supplier = suppliers.find((s) => s.id === suggestion?.supplierId);
  const branch = branches.find((b) => b.id === suggestion?.branchId);

  const calc = useMemo(() => {
    if (!suggestion || !product) return null;
    const ratio = suggestion.suggestedQty > 0 ? qty / suggestion.suggestedQty : 0;
    const cost = qty * product.unitCost;
    const gain = Math.round(suggestion.expectedGainIfOrdered * Math.min(1.15, ratio));
    const lost = Math.round(suggestion.expectedLostSalesIfSkipped * (1 - Math.min(1, ratio) * 0.85));
    const waste = Math.max(0, qty - suggestion.suggestedQty) * product.unitCost;
    return { cost, gain, lost, waste };
  }, [suggestion, product, qty]);

  const qtyInvalid = !Number.isFinite(qty) || qty <= 0;
  const belowMin = !!(supplier && calc && calc.cost < supplier.minOrderValue);

  async function onSend() {
    if (!suggestion || qtyInvalid || !calc) return;
    await send.mutateAsync({ suggestionId: suggestion.id, qty, estimatedCost: calc.cost });
    setSent(true);
    toast.show(M.sentTitle);
  }

  const footer = sent ? (
    <Button onClick={onClose}>{copy.common.close}</Button>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>{copy.common.cancel}</Button>
      <Button onClick={onSend} disabled={qtyInvalid || send.isPending}>{send.isPending ? M.sending : M.send}</Button>
    </>
  );

  return (
    <Modal open={!!suggestion} onClose={onClose} title={M.title} footer={footer}>
      {suggestion && product && supplier && calc && (
        sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-2xl text-primary">✓</span>
            <p className="text-lg font-extrabold">{M.sentTitle}</p>
            <p className="max-w-sm text-sm text-muted">{M.sentText(supplier.email)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">{M.approval}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="order-to" label={M.to} value={supplier.email} readOnly />
              <Field id="order-subject" label={M.subject} value={M.subjectValue(product.name, branch?.name ?? "")} readOnly />
            </div>
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <Field
                id="order-qty"
                label={M.qty}
                type="number"
                min={1}
                step={product.caseSize}
                value={Number.isFinite(qty) ? qty : ""}
                error={qtyInvalid ? M.qtyInvalid : undefined}
                onChange={(e) => setQty(e.target.value === "" ? NaN : Number(e.target.value))}
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">{M.cost}</span>
                <p className="flex min-h-11 items-center text-lg font-extrabold">{formatMoney(calc.cost)}</p>
                <span className="text-xs text-muted">{M.caseHint(product.caseSize)}</span>
              </div>
            </div>
            {belowMin && (
              <p role="alert" className="rounded-[10px] bg-[#FFF4D6] px-3 py-2 text-sm font-semibold text-[#8A5A00]">{M.minWarning(formatMoney(supplier.minOrderValue))}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-alert/30 bg-alert-tint p-4">
                <p className="text-sm font-bold text-alert-dark">{M.skip}</p>
                <p className="mt-2 text-xs text-alert-dark/80">{M.lostSales}</p>
                <p className="text-xl font-extrabold text-alert-dark">−{formatMoney(calc.lost)}</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary-tint p-4">
                <p className="text-sm font-bold text-primary">{M.order}</p>
                <p className="mt-2 text-xs text-primary/80">{M.expectedGain}</p>
                <p className="text-xl font-extrabold text-primary">+{formatMoney(calc.gain)}</p>
                <p className="mt-1 text-xs text-primary/80">{M.waste}: {formatMoney(calc.waste)} · {formatNumber(qty || 0)} {copy.common.units}</p>
              </div>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}
