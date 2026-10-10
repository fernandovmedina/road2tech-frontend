"use client";

import { useCallback, useState } from "react";
import { useFilters } from "@/lib/filters";
import { ChatPanel } from "./ChatPanel";

/**
 * GenUI assistant that can start at chain scope and focus a store when the analysis finds the strongest signal.
 * Choosing another store by hand starts a new conversation; when the assistant itself focuses a store the
 * conversation continues there, so the answer that caused the change stays on screen.
 */
export function AssistantChat({ storeId }: { storeId: string }) {
  const selectedStoreId = storeId && storeId !== "all" ? storeId : "all";
  const setBranch = useFilters((state) => state.setBranch);
  const [focusInput, setFocusInput] = useState(false);
  const [conversation, setConversation] = useState(0);
  const [focusedByAssistant, setFocusedByAssistant] = useState<string | null>(null);
  const [seenStoreId, setSeenStoreId] = useState(selectedStoreId);
  const onAutoFocused = useCallback(() => setFocusInput(false), []);
  const onStorePicked = useCallback(() => setFocusInput(true), []);
  const onFocusStore = useCallback(
    (nextStoreId: string) => {
      // Set first: when the store changes, the panel must already know the assistant asked for it.
      setFocusedByAssistant(nextStoreId);
      setBranch(nextStoreId);
      setFocusInput(true);
    },
    [setBranch],
  );

  // Derived while rendering (no effect): a store change that the assistant did not ask for restarts the conversation.
  if (seenStoreId !== selectedStoreId) {
    setSeenStoreId(selectedStoreId);
    if (focusedByAssistant === selectedStoreId) setFocusedByAssistant(null);
    else setConversation((n) => n + 1);
  }

  const hasStore = selectedStoreId !== "all";

  return (
    <ChatPanel
      key={conversation}
      storeId={selectedStoreId}
      hasStore={hasStore}
      autoFocusInput={focusInput}
      onAutoFocused={onAutoFocused}
      onStorePicked={onStorePicked}
      onFocusStore={onFocusStore}
    />
  );
}
