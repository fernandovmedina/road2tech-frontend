"use client";

import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import type { ChatEntry } from "./chatTypes";
import { ChatBlockView } from "./ChatBlockView";
import { ConstraintChips } from "./ConstraintChips";
import { InterfaceChip } from "./InterfaceChip";
import { isInterfaceBlock } from "./interfaceBlocks";
import { ToolList } from "./ToolList";

const C = copy.chat;

type Props = {
  entry: ChatEntry;
  /** True when this reply's interfaces are the ones on display in "Interfaces generadas". */
  shown: boolean;
  onShowInterfaces: () => void;
  onRetry?: () => void;
};

/** Text stays in the conversation; charts, tables and proposals become a chip that shows them in the canvas. */
export function ChatMessageView({ entry, shown, onShowInterfaces, onRetry }: Props) {
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
  const interfaces = entry.blocks.filter(isInterfaceBlock);
  return (
    <div className="flex flex-col items-start gap-2">
      {entry.tools && <ToolList tools={entry.tools} />}
      {entry.constraints && <ConstraintChips constraints={entry.constraints} />}
      {entry.blocks.map((b, i) => (b.type === "text" ? <ChatBlockView key={i} block={b} /> : null))}
      {interfaces.length > 0 && <InterfaceChip blocks={interfaces} shown={shown} onShow={onShowInterfaces} />}
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
