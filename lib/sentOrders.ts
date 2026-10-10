"use client";

import { useEffect } from "react";
import { create } from "zustand";

// Restock orders the user already e-mailed from this browser. The backend does not know about them yet (orders go
// out through POST /emails, which does not register a purchase order), so without this record the same suggestion
// would keep coming back and the order could be sent twice. The record only remembers what the user did; it never
// computes anything. Kept in localStorage.
// TODO(backend): once POST /restock-orders can register the order without mailing the supplier, the backend marks
// the suggestion (`order_status: "sent"`) and plans around the incoming stock; this record becomes redundant.

const STORAGE_KEY = "stockcopilot.sentOrders";

export type SentOrder = {
  suggestionId: string;
  storeId: string;
  productId: string;
  supplierId: string;
  qty: number;
  orderDate: string;
  expectedDelivery: string;
  sentAt: string;
  /** Address the e-mail was delivered to. */
  to: string;
};

type SentOrdersState = {
  orders: SentOrder[];
  hydrated: boolean;
  hydrate: () => void;
  add: (order: SentOrder) => void;
  clear: () => void;
};

function write(orders: SentOrder[]) {
  try {
    if (orders.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    /* storage unavailable: the record lasts until the page is reloaded */
  }
}

function read(): SentOrder[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is SentOrder =>
        !!o && typeof o === "object" && ["suggestionId", "storeId", "productId", "orderDate", "expectedDelivery"].every((k) => typeof (o as Record<string, unknown>)[k] === "string"),
    );
  } catch {
    return [];
  }
}

export const useSentOrdersStore = create<SentOrdersState>((set, get) => ({
  orders: [],
  hydrated: false,
  // Read after mount (never during render) so server and client markup match.
  hydrate: () => {
    if (get().hydrated) return;
    // Orders added before the first read (same tick) are kept on top of what was saved.
    const merged = [...get().orders, ...read().filter((o) => !get().orders.some((n) => n.suggestionId === o.suggestionId))];
    set({ hydrated: true, orders: merged });
  },
  add: (order) => {
    const next = [...get().orders.filter((o) => o.suggestionId !== order.suggestionId), order];
    write(next);
    set({ orders: next });
  },
  clear: () => {
    write([]);
    set({ orders: [] });
  },
}));

/** Orders sent from this browser. Loads the saved list on first use. */
export function useSentOrders() {
  const { orders, hydrate, add, clear } = useSentOrdersStore();
  useEffect(() => hydrate(), [hydrate]);
  return { orders, add, clear };
}

/**
 * A sent order covers its own suggestion and any other suggestion of the same product whose order date falls before
 * the sent order arrives (ordering again then would double the stock). Later cycles are still suggested.
 */
export const coversSuggestion = (o: SentOrder, s: { id: string; store_id: string; product_id: string; order_date: string }): boolean =>
  o.suggestionId === s.id || (o.storeId === s.store_id && o.productId === s.product_id && s.order_date <= o.expectedDelivery);
