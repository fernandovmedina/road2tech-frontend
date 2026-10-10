"use client";

import { useRef, useState } from "react";
import { chatChannel, isConversationNotFound, useSendChat } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import type { ChatEntry } from "./chatTypes";
import { isInterfaceBlock } from "./interfaceBlocks";

const C = copy.chat;

const welcome: ChatEntry = { id: "welcome", role: "assistant", blocks: [{ type: "text", text: C.welcome }] };

/**
 * Conversation with the assistant for one store, plus the reply whose interfaces are on display.
 * The panel is keyed by store, so a new store starts a new conversation (the backend conversation is per store).
 * `canAutoShow` lets the panel keep the current interface on screen (e.g. while one of its dialogs is open).
 */
export function useAssistantConversation(
  storeId: string,
  enabled: boolean,
  canAutoShow: () => boolean = () => true,
  onFocusStore?: (storeId: string) => void,
) {
  const sendChat = useSendChat();
  const [messages, setMessages] = useState<ChatEntry[]>([welcome]);
  const [pending, setPending] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);
  const [focusProductId, setFocusProductId] = useState<string | null>(null);
  const conversationIds = useRef(new Map<string, string>());
  const seq = useRef(0);

  async function ask(message: string) {
    const channel = chatChannel(storeId, message);
    const key = `${channel}|${storeId || "all"}`;
    const conversationId = conversationIds.current.get(key) ?? null;
    try {
      return await sendChat.mutateAsync({ storeId, conversationId, contextProductId: focusProductId, message });
    } catch (e) {
      // The backend forgot the conversation (or it belongs to another store or session). Answers do not depend on the
      // history, so the message opens a new one; the stale id is dropped first so a later retry never reuses it.
      if (!conversationId || !isConversationNotFound(e)) throw e;
      conversationIds.current.delete(key);
      return await sendChat.mutateAsync({ storeId, conversationId: null, contextProductId: focusProductId, message });
    }
  }

  async function run(text: string) {
    setPending(true);
    try {
      const reply = await ask(text);
      conversationIds.current.set(`${reply.channel}|${storeId || "all"}`, reply.conversationId);
      if (reply.focusProductId) setFocusProductId(reply.focusProductId);
      const id = `a-${++seq.current}`;
      setMessages((m) => [
        ...m,
        { id, role: "assistant", tools: reply.tools, constraints: reply.constraints, blocks: reply.blocks, dropped: reply.dropped },
      ]);
      // A reply with charts, tables or proposals goes straight to "Interfaces generadas".
      if (reply.blocks.some(isInterfaceBlock) && canAutoShow()) setShownId(id);
      if (reply.focusStoreId && reply.focusStoreId !== storeId) onFocusStore?.(reply.focusStoreId);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `e-${++seq.current}`, role: "assistant", error: true, retryText: text, blocks: [{ type: "text", text: C.error }] },
      ]);
    } finally {
      setPending(false);
    }
  }

  /** Returns false when the message was not sent (empty, pending, or disabled). */
  function send(raw: string): boolean {
    const text = raw.trim();
    if (!text || pending || !enabled) return false;
    setMessages((m) => [...m, { id: `u-${++seq.current}`, role: "user", blocks: [{ type: "text", text }] }]);
    void run(text);
    return true;
  }

  function retry(entry: ChatEntry) {
    if (!entry.retryText || pending) return;
    setMessages((m) => m.filter((x) => x.id !== entry.id));
    void run(entry.retryText);
  }

  return { messages, pending, send, retry, shownId, show: setShownId };
}
