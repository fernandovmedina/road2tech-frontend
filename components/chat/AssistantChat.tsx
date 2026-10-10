"use client";

import { ChatPanel } from "./ChatPanel";

/**
 * GenUI assistant for one store. Without a store ("" or "all") it invites the user to pick one.
 * Keyed by store so each store gets its own conversation (the backend conversation_id is per store).
 */
export function AssistantChat({ storeId }: { storeId: string }) {
  const hasStore = storeId !== "" && storeId !== "all";
  return <ChatPanel key={hasStore ? storeId : "none"} storeId={storeId} hasStore={hasStore} />;
}
