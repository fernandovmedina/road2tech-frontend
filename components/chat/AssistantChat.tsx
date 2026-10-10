"use client";

import { useCallback, useState } from "react";
import { useFilters } from "@/lib/filters";
import { ChatPanel } from "./ChatPanel";

/**
 * GenUI assistant that can start at chain scope and focus a store when the analysis finds the strongest signal.
 */
export function AssistantChat({ storeId }: { storeId: string }) {
  const selectedStoreId = storeId && storeId !== "all" ? storeId : "all";
  const setBranch = useFilters((state) => state.setBranch);
  const [focusInput, setFocusInput] = useState(false);
  const onAutoFocused = useCallback(() => setFocusInput(false), []);
  const onStorePicked = useCallback(() => setFocusInput(true), []);
  const onFocusStore = useCallback(
    (nextStoreId: string) => {
      setBranch(nextStoreId);
      setFocusInput(true);
    },
    [setBranch],
  );

  const hasStore = selectedStoreId !== "all";

  return (
    <ChatPanel
      storeId={selectedStoreId}
      hasStore={hasStore}
      autoFocusInput={focusInput}
      onAutoFocused={onAutoFocused}
      onStorePicked={onStorePicked}
      onFocusStore={onFocusStore}
    />
  );
}
