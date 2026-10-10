"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { BranchSelect } from "@/components/layout/BranchSelect";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageView } from "./ChatMessageView";
import { GeneratedInterfaces } from "./GeneratedInterfaces";
import { isInterfaceBlock } from "./interfaceBlocks";
import { useAssistantConversation } from "./useAssistantConversation";

const C = copy.chat;

type Props = {
  storeId: string;
  hasStore: boolean;
  /** Focus the message box on mount (the store was just picked from this panel's own selector). */
  autoFocusInput?: boolean;
  onAutoFocused?: () => void;
  onStorePicked?: () => void;
  onFocusStore?: (storeId: string) => void;
};

/**
 * Assistant workspace for one store: the conversation on one side and, next to it, the interfaces (charts, tables,
 * proposals) the assistant builds with the data. At chain scope, an analysis can select the most relevant store.
 * The chat only proposes: approving always happens from the plan, with a confirmation.
 */
export function ChatPanel({ storeId, hasStore, autoFocusInput = false, onAutoFocused, onStorePicked, onFocusStore }: Props) {
  const store = useStore(hasStore ? storeId : "all");
  const canvasRef = useRef<HTMLElement>(null);
  const canvasTitleRef = useRef<HTMLParagraphElement>(null);
  // A new reply does not take over the canvas while the user is working in the interface on display: one of its
  // dialogs (e.g. "Aprobar") is open or the focus is on one of its controls (hiding it would drop the focus).
  const chat = useAssistantConversation(
    storeId,
    true,
    () => {
      const focusInReply = !!document.activeElement?.closest("[data-interface-reply]");
      return !canvasRef.current?.querySelector("dialog[open]") && !focusInReply;
    },
    onFocusStore,
  );
  const logRef = useRef<HTMLDivElement>(null);

  // Scroll inside the log only (scrollIntoView would also move the whole page).
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.pending]);

  useEffect(() => {
    if (autoFocusInput) onAutoFocused?.();
  }, [autoFocusInput, onAutoFocused]);

  const replies = chat.messages.filter((m) => m.role === "assistant" && m.blocks.some(isInterfaceBlock));
  const shownId = chat.shownId ?? replies[replies.length - 1]?.id ?? null;
  const lastId = chat.messages[chat.messages.length - 1]?.id;

  function showInCanvas(id: string) {
    chat.show(id);
    // Focus moves to the canvas so keyboard and narrow screens land on it.
    canvasTitleRef.current?.focus();
  }

  return (
    <section aria-labelledby="assistant-title">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="assistant-title" className="text-lg font-extrabold">{C.title}</h2>
            <p className="text-sm text-muted">{C.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Badge tone="green">{store ? `${C.storeLabel}: ${displayBranchName(store)}` : C.chainLabel}</Badge>
            <BranchSelect id="assistant-branch" includeAll label={C.pickStoreLabel} onPicked={onStorePicked} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label={C.logLabel}
              className="flex max-h-[520px] min-h-[260px] flex-col gap-4 overflow-y-auto rounded-xl bg-background p-4"
            >
              {chat.messages.map((m) => (
                <ChatMessageView
                  key={m.id}
                  entry={m}
                  shown={m.id === shownId}
                  onShowInterfaces={() => showInCanvas(m.id)}
                  onRetry={m.error && m.id === lastId ? () => chat.retry(m) : undefined}
                />
              ))}
              {chat.pending && (
                <p role="status" className="text-sm font-medium text-muted motion-safe:animate-pulse">{C.typing}</p>
              )}
            </div>
            <ChatComposer pending={chat.pending} onSend={chat.send} autoFocus={autoFocusInput} />
          </div>
          <GeneratedInterfaces
            replies={replies}
            shownId={shownId}
            onShow={chat.show}
            pending={chat.pending}
            sectionRef={canvasRef}
            titleRef={canvasTitleRef}
          />
        </div>
      </Card>
    </section>
  );
}
