"use client";

import { useState } from "react";
import { useSendEmail } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { buildTestEmail } from "@/lib/emailTemplates";
import { useMailRecipient } from "@/lib/mailSettings";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MailRecipientField } from "@/components/ui/MailRecipientField";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Supplier } from "@/types";

const R = copy.suppliers.resend;

/**
 * "Resend conectado": sends a test e-mail for the selected supplier after an explicit confirmation.
 * The parent keys this component by supplier id so the mutation result resets when the selection changes.
 * The message goes to the address configured in the field (lib/mailSettings.ts), never to the supplier's own address.
 */
export function ResendCard({ supplier }: { supplier: Supplier | null }) {
  const send = useSendEmail();
  const { recipient } = useMailRecipient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const openConfirm = () => {
    send.reset();
    setConfirming(true);
  };

  const confirm = () => {
    if (!supplier) return;
    send.mutate({ to: recipient, subject: copy.mail.test.subject, fromName: copy.shell.brand, ...buildTestEmail(supplier.supplier_name, supplier.email) }, {
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
        <h2 className="text-lg font-bold">{R.title}</h2>
      </div>
      <p className="text-sm text-muted">{R.text}</p>

      <MailRecipientField id="mail-recipient" label={R.to} />
      {supplier ? (
        <p className="rounded-block bg-background p-3 text-xs text-muted">{R.supplierLine(supplier.supplier_name, supplier.email)}</p>
      ) : (
        <p className="rounded-block bg-background p-3 text-sm text-muted">{R.noSupplier}</p>
      )}

      <Button variant="secondary" disabled={!supplier} onClick={openConfirm}>{R.test}</Button>

      <div aria-live="polite">
        {send.data && (
          <div className="rounded-block border border-primary/30 bg-primary-tint p-3 text-sm text-primary">
            <p className="font-bold">{R.ok(send.data.email.to)}</p>
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
          {supplier && <p>{R.confirmText(recipient)}</p>}
          <p className="rounded-block bg-accent-tint p-3 text-accent-dark">{R.demoNotice}</p>
          {send.isError && (
            <p role="alert" className="rounded-block border border-alert/30 bg-alert-tint p-3 font-semibold text-alert-dark">{R.error}</p>
          )}
        </div>
      </Modal>
    </Card>
  );
}
