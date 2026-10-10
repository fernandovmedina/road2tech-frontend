"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { isValidEmail, useMailRecipient } from "@/lib/mailSettings";
import { Field } from "./Field";

const R = copy.mail.recipient;

/** Editable "where do supplier e-mails go" field. A valid address is saved as you type (in this browser only). */
export function MailRecipientField({ id, label = R.label, showHint = true }: { id: string; label?: string; showHint?: boolean }) {
  const { recipient, setRecipient, reset, isDefault } = useMailRecipient();
  // null = show the saved address; a string = what the user is typing (it may be invalid and is then not saved).
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? recipient;
  const error = draft !== null && !isValidEmail(draft) ? R.invalid : undefined;

  return (
    <div className="flex flex-col gap-1">
      <Field
        id={id}
        label={label}
        type="email"
        inputMode="email"
        autoComplete="off"
        value={value}
        error={error}
        onChange={(e) => {
          setDraft(e.target.value);
          setRecipient(e.target.value);
        }}
        // Leaving the field with an invalid text goes back to the saved address, which is the one that will be used.
        onBlur={() => setDraft(null)}
      />
      {showHint && <p className="text-xs text-muted">{R.hint}</p>}
      {!isDefault && (
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            reset();
          }}
          className="min-h-11 self-start text-xs font-bold text-primary hover:underline"
        >
          {R.reset}
        </button>
      )}
    </div>
  );
}
