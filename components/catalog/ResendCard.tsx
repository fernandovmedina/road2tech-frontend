"use client";

import { useState } from "react";
import { useSendTestEmail } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Supplier } from "@/types";

const R = copy.suppliers.resend;

/**
 * "Resend conectado": sends a test e-mail to the selected supplier after an explicit confirmation.
 * The parent keys this component by supplier id so the mutation result resets when the selection changes.
 * TODO(backend): the real recipient is resolved by the backend; in demo it is redirected to a test mailbox.
 */
export function ResendCard({ supplier }: { supplier: Supplier | null }) {
  const send = useSendTestEmail();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const openConfirm = () => {
    send.reset();
    setConfirming(true);
  };

  const confirm = () => {
    if (!supplier) return;
    send.mutate(supplier.supplier_id, {
      // The result stays visible in the card through `send.data`.
      onSuccess: () => {
        setConfirming(false);
        toast.show(R.sentToast);
      },
    });
  };

  return (
    <Card className="flex flex-col gap-4 self-start">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary" />
        <h2 className="text-lg font-extrabold">{R.title}</h2>
      </div>
      <p className="text-sm text-muted">{R.text}</p>

      {supplier ? (
        <dl className="rounded-xl bg-background p-3 text-sm">
          <dt className="text-xs font-semibold text-muted">{R.to}</dt>
          <dd className="break-all font-bold">{supplier.email}</dd>
          <dd className="mt-0.5 text-xs text-muted">{supplier.supplier_name}</dd>
        </dl>
      ) : (
        <p className="rounded-xl bg-background p-3 text-sm text-muted">{R.noSupplier}</p>
      )}

      <Button variant="secondary" disabled={!supplier} onClick={openConfirm}>{R.test}</Button>

      <div aria-live="polite">
        {send.data && (
          <div className="rounded-xl border border-primary/30 bg-primary-tint p-3 text-sm text-primary">
            <p className="font-bold">{R.ok(send.data.email.to)}</p>
            {send.data.demo_redirect && <p className="mt-0.5 text-xs">{R.okRedirected}</p>}
          </div>
        )}
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={R.confirmTitle}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>{copy.common.cancel}</Button>
            <Button onClick={confirm} disabled={send.isPending}>{send.isPending ? R.sending : R.confirmSend}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          {supplier && <p>{R.confirmText(supplier.email)}</p>}
          <p className="rounded-xl bg-accent-tint p-3 text-accent-dark">{R.demoNotice}</p>
          {send.isError && (
            <p role="alert" className="rounded-xl border border-alert/30 bg-alert-tint p-3 font-semibold text-alert-dark">{R.error}</p>
          )}
        </div>
      </Modal>
    </Card>
  );
}
