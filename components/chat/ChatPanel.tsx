"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSendChat, useStore } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import type { ChatEntry } from "./chatTypes";
import { ChatMessageView } from "./ChatMessageView";

const C = copy.chat;

const welcome: ChatEntry = { id: "welcome", role: "assistant", blocks: [{ type: "text", text: C.welcome }] };

/**
 * One conversation for one store. The parent keys it by store, so changing the store starts a new conversation.
 * The chat only proposes: approving always happens from the plan, with a confirmation.
 */
export function ChatPanel({ storeId, hasStore }: { storeId: string; hasStore: boolean }) {
  const store = useStore(hasStore ? storeId : "all");
  const sendChat = useSendChat();
  const [messages, setMessages] = useState<ChatEntry[]>([welcome]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const conversationId = useRef<string | null>(null);
  const seq = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  // Scroll inside the log only (scrollIntoView would also move the whole page).
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  async function run(text: string) {
    setPending(true);
    try {
      const reply = await sendChat.mutateAsync({ storeId, conversationId: conversationId.current, message: text });
      conversationId.current = reply.conversationId;
      setMessages((m) => [
        ...m,
        {
          id: `a-${++seq.current}`,
          role: "assistant",
          tools: reply.tools,
          constraints: reply.constraints,
          blocks: reply.blocks,
          dropped: reply.dropped,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `e-${++seq.current}`, role: "assistant", error: true, retryText: text, blocks: [{ type: "text", text: C.error }] },
      ]);
    } finally {
      setPending(false);
    }
  }

  function send(raw: string) {
    const text = raw.trim();
    if (!text || pending || !hasStore) return;
    setMessages((m) => [...m, { id: `u-${++seq.current}`, role: "user", blocks: [{ type: "text", text }] }]);
    setInput("");
    void run(text);
  }

  function retry(entry: ChatEntry) {
    if (!entry.retryText || pending) return;
    setMessages((m) => m.filter((x) => x.id !== entry.id));
    void run(entry.retryText);
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const lastId = messages[messages.length - 1]?.id;

  return (
    <section aria-labelledby="assistant-title">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="assistant-title" className="text-lg font-bold">{C.title}</h2>
            <p className="text-sm text-muted">{C.subtitle}</p>
          </div>
          {store && <Badge tone="green">{C.storeLabel}: {displayBranchName(store)}</Badge>}
        </div>

        {hasStore ? (
          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label={C.logLabel}
            className="flex max-h-[560px] min-h-[220px] flex-col gap-4 overflow-y-auto rounded-block bg-background p-4"
          >
            {messages.map((m) => (
              <ChatMessageView key={m.id} entry={m} onRetry={m.error && m.id === lastId ? () => retry(m) : undefined} />
            ))}
            {pending && (
              <p role="status" className="text-sm font-medium text-muted motion-safe:animate-pulse">{C.typing}</p>
            )}
          </div>
        ) : (
          <EmptyState title={C.pickStoreTitle} text={C.pickStoreText} />
        )}

        <div className="flex flex-col gap-2">
          <p id="chat-quick-label" className="sr-only">{C.quickPromptsLabel}</p>
          <div role="group" aria-labelledby="chat-quick-label" className="flex flex-wrap gap-2">
            {C.quickPrompts.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={pending || !hasStore}
                onClick={() => send(q.prompt)}
                title={q.prompt}
                className="min-h-11 rounded-full border border-primary/30 bg-primary-tint px-4 text-left text-sm font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">{C.inputLabel}</label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!hasStore}
            placeholder={hasStore ? C.placeholder : C.placeholderNoStore}
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-control border border-line bg-card px-3 text-sm disabled:cursor-not-allowed disabled:bg-background"
          />
          <Button type="submit" disabled={!hasStore || pending || !input.trim()}>{C.send}</Button>
        </form>
      </Card>
    </section>
  );
}
