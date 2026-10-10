"use client";

import { useEffect } from "react";
import { create } from "zustand";

// Where supplier e-mails (restock orders and tests) are delivered. In this phase every supplier's mail goes to one
// address chosen by the user in the UI, so the real supplier addresses are never used. It is kept in this browser's
// localStorage; nothing is baked into the build or the backend environment.

export const DEFAULT_MAIL_RECIPIENT = "daniel.sunflores@gmail.com";
const STORAGE_KEY = "stockcopilot.mailRecipient";

export const isValidEmail = (v: string): boolean => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(v.trim());

type MailSettings = {
  recipient: string;
  hydrated: boolean;
  hydrate: () => void;
  setRecipient: (value: string) => void;
  reset: () => void;
};

function write(value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable: the choice lasts until the page is reloaded */
  }
}

export const useMailSettings = create<MailSettings>((set, get) => ({
  recipient: DEFAULT_MAIL_RECIPIENT,
  hydrated: false,
  // Read after mount (never during render) so server and client markup match.
  hydrate: () => {
    if (get().hydrated) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    set({ hydrated: true, ...(stored && isValidEmail(stored) ? { recipient: stored.trim() } : {}) });
  },
  setRecipient: (value) => {
    if (!isValidEmail(value)) return;
    const next = value.trim();
    write(next === DEFAULT_MAIL_RECIPIENT ? null : next);
    set({ recipient: next });
  },
  reset: () => {
    write(null);
    set({ recipient: DEFAULT_MAIL_RECIPIENT });
  },
}));

/** Current e-mail destination for supplier messages, with its setters. Loads the saved value on first use. */
export function useMailRecipient() {
  const { recipient, hydrate, setRecipient, reset } = useMailSettings();
  useEffect(() => hydrate(), [hydrate]);
  return { recipient, setRecipient, reset, isDefault: recipient === DEFAULT_MAIL_RECIPIENT };
}
