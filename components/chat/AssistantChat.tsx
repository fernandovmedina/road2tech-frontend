"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { askAssistant } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import type { ChatBlock, ChatMessage, RestockSuggestion } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TrendChart } from "@/components/product/TrendChart";
import { RestockTable } from "./RestockTable";
import { OrderModal } from "@/components/calendar/OrderModal";

const C = copy.assistant;

const welcome: ChatMessage = { id: "welcome", role: "assistant", blocks: [{ type: "text", text: C.welcome }] };

export function AssistantChat({ branchId }: { branchId: string | "all" }) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [orderFor, setOrderFor] = useState<RestockSuggestion | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages, pending]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || pending) return;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", blocks: [{ type: "text", text: prompt }] }]);
    setInput("");
    setPending(true);
    try {
      const reply = await askAssistant(prompt, branchId);
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", ...reply }]);
    } catch {
      setMessages((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", blocks: [{ type: "text", text: copy.common.errorText }] }]);
    } finally {
      setPending(false);
    }
  }

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(input); };

  return (
    <section aria-labelledby="assistant-title">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 id="assistant-title" className="text-lg font-extrabold">{C.title}</h2>
          <p className="text-sm text-muted">{C.subtitle}</p>
        </div>

        <div className="flex max-h-[520px] min-h-[220px] flex-col gap-4 overflow-y-auto rounded-xl bg-background p-4" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.tool && (
                <span className="rounded-md bg-sidebar px-2 py-1 font-mono text-xs text-sidebar-text" aria-label={`${C.toolLabel}: ${m.tool}`}>
                  ⚙ {m.tool}
                </span>
              )}
              {m.blocks.map((b, i) => (
                <Block key={i} block={b} user={m.role === "user"} onProceed={(s) => setOrderFor(s)} />
              ))}
            </div>
          ))}
          {pending && <p className="text-sm font-medium text-muted">{C.typing}</p>}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-2">
          {C.quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              disabled={pending}
              onClick={() => void send(q)}
              className="min-h-10 rounded-full border border-primary/30 bg-primary-tint px-4 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">{C.placeholder}</label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={C.placeholder}
            className="min-h-11 flex-1 rounded-[10px] border border-line bg-white px-3 text-sm"
          />
          <Button type="submit" disabled={pending || !input.trim()}>{C.send}</Button>
        </form>
      </Card>

      <OrderModal suggestion={orderFor} onClose={() => setOrderFor(null)} />
    </section>
  );
}

function Block({ block, user, onProceed }: { block: ChatBlock; user: boolean; onProceed: (s: RestockSuggestion) => void }) {
  if (block.type === "text") {
    return (
      <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${user ? "bg-primary text-white" : "border border-line bg-white"}`}>
        {block.text}
      </p>
    );
  }
  if (block.type === "trend_chart") {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-white p-4">
        <p className="mb-2 text-sm font-bold">{C.chartTitle}</p>
        <TrendChart points={block.points} height={220} withPromo={false} compact />
        <p className="mt-1 text-xs text-muted">— {C.history} · - - {C.forecast}</p>
      </div>
    );
  }
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-line bg-white p-4">
      <RestockTable suggestions={block.suggestions} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {block.suggestions[0] && (
          <Button size="sm" onClick={() => onProceed(block.suggestions[0])}>{C.proceed}</Button>
        )}
        <span className="text-xs text-muted">{C.approvalNote}</span>
      </div>
    </div>
  );
}
