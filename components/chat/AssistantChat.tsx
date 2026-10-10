"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { copilotAgentEnabled } from "@/lib/api/config";
import { useFilters } from "@/lib/filters";
import { ChatPanel } from "./ChatPanel";

// The agent chat (CopilotKit) is heavy and cannot be prerendered: it loads only when the agent is configured.
const CopilotChatPanel = dynamic(() => import("@/components/copilot/CopilotChatPanel"), {
  ssr: false,
  loading: () => (
    <Card aria-busy="true">
      <Skeleton className="h-[640px] w-full" />
    </Card>
  ),
});

/**
 * Dashboard assistant. With NEXT_PUBLIC_COPILOT_URL (and not in mock mode) it is the LangGraph agent with generative UI;
 * otherwise it is the fallback chat over POST /chat / lib/mock, so the demo always has a chat that works.
 */
export function AssistantChat({ storeId }: { storeId: string }) {
  if (copilotAgentEnabled) return <AgentChat storeId={storeId} />;
  return <FallbackChat storeId={storeId} />;
}

/** One conversation per store: the panel remounts with a key when the selected store changes. */
function AgentChat({ storeId }: { storeId: string }) {
  const selectedStoreId = storeId && storeId !== "all" ? storeId : "all";
  return <CopilotChatPanel key={selectedStoreId} storeId={selectedStoreId} />;
}

/**
 * GenUI assistant that can start at chain scope and focus a store when the analysis finds the strongest signal.
 * Choosing another store by hand starts a new conversation; when the assistant itself focuses a store the
 * conversation continues there, so the answer that caused the change stays on screen.
 */
function FallbackChat({ storeId }: { storeId: string }) {
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
