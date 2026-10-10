"use client";

import type { Ref } from "react";
import { Sparkles } from "lucide-react";
import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import type { ChatEntry } from "./chatTypes";
import { ChatBlockView } from "./ChatBlockView";
import { interfaceLabel, isInterfaceBlock } from "./interfaceBlocks";

const C = copy.chat.canvas;

type Props = {
  /** Assistant replies that produced at least one interface, oldest first. */
  replies: ChatEntry[];
  shownId: string | null;
  onShow: (id: string) => void;
  pending: boolean;
  sectionRef: Ref<HTMLElement>;
  titleRef: Ref<HTMLParagraphElement>;
};

/** Canvas next to the conversation: the charts, tables and proposals of one reply, at full size. */
export function GeneratedInterfaces({ replies, shownId, onShow, pending, sectionRef, titleRef }: Props) {
  const { nameOf } = useCatalog();
  const shown = replies.find((r) => r.id === shownId) ?? replies[replies.length - 1];

  return (
    <section ref={sectionRef} aria-labelledby="interfaces-title" className="flex min-w-0 flex-col gap-3 rounded-xl bg-background p-4">
      <div>
        {/* Not a heading: the blocks inside carry their own h3 under the assistant's h2. */}
        <p id="interfaces-title" ref={titleRef} tabIndex={-1} className="flex items-center gap-2 text-base font-extrabold">
          <Sparkles aria-hidden className="size-4 text-primary" />
          {C.title}
        </p>
        <p className="text-xs text-muted">{C.subtitle}</p>
      </div>

      {replies.length > 1 && (
        <div role="group" aria-label={C.historyLabel} className="flex gap-2 overflow-x-auto pb-1">
          {replies.map((r, i) => {
            const items = r.blocks.filter(isInterfaceBlock);
            const active = r.id === shown?.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onShow(r.id)}
                className={`inline-flex min-h-10 max-w-64 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
                  active ? "border-primary bg-primary text-white" : "border-line bg-white text-foreground hover:border-primary/40"
                }`}
              >
                <span className="truncate">{`${i + 1}. ${interfaceLabel(items[0], nameOf)}`}</span>
                {items.length > 1 && <span className="shrink-0 opacity-80">{C.more(items.length - 1)}</span>}
              </button>
            );
          })}
        </div>
      )}

      {pending && (
        <div aria-hidden className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
          <p className="text-sm font-medium text-muted motion-safe:animate-pulse">{C.pending}</p>
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      )}

      {replies.length > 0 ? (
        // Every reply stays mounted so its cards keep their state (a strategy added to the plan, an action in flight);
        // only the one on display takes space. Hidden ones keep their width so charts never measure 0×0; opacity and
        // inert also cover descendants that force `visibility: visible` (the chart tooltip).
        <div className="relative overflow-hidden">
          {replies.map((r) => {
            const visible = r.id === shown?.id;
            return (
              <div
                key={r.id}
                data-interface-reply=""
                inert={!visible}
                className={`flex flex-col gap-4 ${visible ? "" : "invisible pointer-events-none absolute inset-x-0 top-0 opacity-0"}`}
              >
                {r.blocks.filter(isInterfaceBlock).map((b, i) => (
                  <ChatBlockView key={i} block={b} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        !pending && <EmptyState title={C.emptyTitle} text={C.emptyText} />
      )}
    </section>
  );
}
