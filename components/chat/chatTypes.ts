import type { ChatBlock, ChatMessage } from "@/types";

/** A conversation entry plus the UI-only fields the chat needs. */
export type ChatEntry = ChatMessage & {
  /** Number of blocks of the reply that were dropped because they were unknown or invalid. */
  dropped?: number;
  /** For error entries: the user text that "Reintentar" sends again. */
  retryText?: string;
};

export type BlockOf<T extends ChatBlock["type"]> = Extract<ChatBlock, { type: T }>;
