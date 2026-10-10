"use client";

import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { interfaceIcons, interfaceLabel, type InterfaceBlock } from "./interfaceBlocks";

const C = copy.chat.canvas;

/** In the conversation, the interfaces of a reply show as one button that puts them on display next to it. */
export function InterfaceChip({ blocks, shown, onShow }: { blocks: InterfaceBlock[]; shown: boolean; onShow: () => void }) {
  const { nameOf } = useCatalog();

  return (
    <button
      type="button"
      onClick={onShow}
      aria-current={shown ? "true" : undefined}
      className={`flex min-h-11 max-w-[85%] flex-col items-start gap-1 rounded-2xl border px-4 py-2.5 text-left text-sm ${
        shown ? "border-primary bg-primary-tint" : "border-line bg-white hover:border-primary/40 hover:bg-primary-tint/60"
      }`}
    >
      {blocks.map((b, i) => {
        const Icon = interfaceIcons[b.type];
        return (
          <span key={i} className="flex items-center gap-2 font-semibold text-foreground">
            <Icon aria-hidden className="size-4 shrink-0 text-primary" />
            <span className="break-words">{interfaceLabel(b, nameOf)}</span>
          </span>
        );
      })}
      <span className="text-xs font-bold text-primary">{shown ? C.shown : C.show}</span>
    </button>
  );
}
