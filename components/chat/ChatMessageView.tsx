"use client";

import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import type { ChatEntry } from "./chatTypes";
import { ChatBlockView } from "./ChatBlockView";
import { ConstraintChips } from "./ConstraintChips";
import { ToolList } from "./ToolList";

const C = copy.chat;

export function ChatMessageView({ entry, onRetry }: { entry: ChatEntry; onRetry?: () => void }) {
  if (entry.role === "user") {
    return (
      <div className="flex justify-end">
        {entry.blocks.map((b, i) =>
          b.type === "text" ? (
            <p key={i} className="max-w-[85%] whitespace-pre-wrap break-words rounded-card bg-primary px-4 py-2.5 text-sm leading-relaxed text-white">
              {b.text}
            </p>
          ) : null,
        )}
      </div>
    );
  }

  const dropped = entry.dropped ?? 0;
  return (
    <div className="flex flex-col items-start gap-2">
      {entry.tools && <ToolList tools={entry.tools} />}
      {entry.constraints && <ConstraintChips constraints={entry.constraints} />}
      {entry.blocks.map((b, i) => (
        <ChatBlockView key={i} block={b} />
      ))}
      {entry.blocks.length === 0 && dropped === 0 && !entry.error && <p className="text-sm text-muted">{C.emptyReply}</p>}
      {dropped > 0 && <p className="text-xs text-muted">{C.droppedNotice}</p>}
      {entry.error && onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {copy.common.retry}
        </Button>
      )}
    </div>
  );
}
