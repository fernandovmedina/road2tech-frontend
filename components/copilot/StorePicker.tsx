"use client";

import { useEffect, useState } from "react";

import { fetchStores } from "@/lib/api/copilotApi";
import type { StoreRef } from "@/types/copilot";

type StorePickerProps = { value: string; onChange: (storeId: string) => void };

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; stores: StoreRef[] };

export function StorePicker({ value, onChange }: StorePickerProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetchStores()
      .then((response) => active && setState({ status: "ready", stores: response.data }))
      .catch((error: unknown) =>
        active && setState({ status: "error", message: error instanceof Error ? error.message : "Could not load stores." }),
      );
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <div aria-busy="true" className="h-9 w-64 animate-pulse rounded-lg bg-surface-muted" />;
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-critical-ink">
        ▲ {state.message} Start the Copilot API (BackendRoad2Tech/services/copilot-api).
      </p>
    );
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-secondary">Branch</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 max-w-72 rounded-lg border border-line bg-surface px-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
      >
        {state.stores.map((store) => (
          <option key={store.store_id} value={store.store_id}>
            {store.store_id} · {store.store_name.replace(/^OXXO /, "")} ({store.zone_type})
          </option>
        ))}
      </select>
    </label>
  );
}
