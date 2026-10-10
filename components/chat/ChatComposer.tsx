"use client";

import { useState, type FormEvent } from "react";
import { CHAT_MESSAGE_MAX_CHARS } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";

const C = copy.chat;

type Props = {
  pending: boolean;
  /** Returns false when the message was not accepted. */
  onSend: (text: string) => boolean;
  autoFocus?: boolean;
};

/** Quick prompts and the message box. Over the length limit the message is kept and explained, never cut. */
export function ChatComposer({ pending, onSend, autoFocus = false }: Props) {
  const [input, setInput] = useState("");
  const tooLong = input.length > CHAT_MESSAGE_MAX_CHARS;

  const submit = (text: string) => {
    if (text.length > CHAT_MESSAGE_MAX_CHARS) return;
    if (onSend(text)) setInput("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <p id="chat-quick-label" className="sr-only">{C.quickPromptsLabel}</p>
        <div role="group" aria-labelledby="chat-quick-label" className="flex flex-wrap gap-2">
          {C.quickPrompts.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={pending}
              onClick={() => submit(q.prompt)}
              title={q.prompt}
              className="min-h-11 rounded-full border border-primary/30 bg-primary-tint px-4 text-left text-sm font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">{C.inputLabel}</label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus={autoFocus}
            aria-invalid={tooLong || undefined}
            aria-describedby={tooLong ? "chat-input-limit" : undefined}
            placeholder={C.placeholder}
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3 text-sm"
          />
          <Button type="submit" disabled={pending || !input.trim() || tooLong}>{C.send}</Button>
        </div>
        {tooLong && (
          <p id="chat-input-limit" role="alert" className="text-xs font-semibold text-alert-dark">
            {C.tooLong(CHAT_MESSAGE_MAX_CHARS)}
          </p>
        )}
      </form>
    </div>
  );
}
