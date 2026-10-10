"use client";

import { CopilotChat, CopilotKitProvider, useAgent, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { useEffect, useState } from "react";

import { CopilotRenderers } from "./CopilotRenderers";
import { StorePicker } from "./StorePicker";

const DEFAULT_STORE = "S016";

const SUGGESTIONS = [
  { title: "Store overview", message: "How is my store doing this week?" },
  { title: "Product trend", message: "Show the trend and forecast of Coca-Cola 600 ml" },
  { title: "Reduce waste", message: "Strategy to reduce waste of Ham and Cheese Sandwich, max 30% discount" },
  { title: "Restock", message: "What should I restock today?" },
  { title: "Compare branches", message: "Compare demand for Tecate Original 473 ml across all branches" },
  { title: "Weekly plan", message: "Build this week's commercial plan" },
];

/** Keeps the agent's shared state in sync with the branch picked in the header. */
function SelectedStoreSync({ storeId }: { storeId: string }) {
  const { agent } = useAgent();
  useEffect(() => {
    agent.setState({ ...(agent.state ?? {}), selected_store_id: storeId });
  }, [agent, storeId]);
  return null;
}

function Suggestions() {
  useConfigureSuggestions({ suggestions: SUGGESTIONS, available: "before-first-message" });
  return null;
}

export function CopilotWorkspace() {
  const [storeId, setStoreId] = useState(DEFAULT_STORE);

  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" enableInspector={false}>
      <CopilotRenderers />
      <Suggestions />
      <SelectedStoreSync storeId={storeId} />
      <div className="flex h-dvh flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-6">
          <div>
            <h1 className="text-lg font-semibold">
              Stock<span className="text-accent">Copilot</span>
            </h1>
            <p className="text-xs text-ink-secondary">
              Ask about trends, restock and promotions. Every number comes from the analytics engine; the AI explains it.
            </p>
          </div>
          <StorePicker value={storeId} onChange={setStoreId} />
        </header>
        <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <CopilotChat
            className="h-full"
            labels={{
              chatInputPlaceholder: "Ask StockCopilot, e.g. “¿Qué debo reabastecer hoy?”",
              welcomeMessageText: "Hi! I’m your store copilot. Pick a branch above and ask me anything about it.",
            }}
          />
        </main>
      </div>
    </CopilotKitProvider>
  );
}
