import { copy } from "@/lib/copy";
import type { PolicySuggestion } from "@/types";

// Pure helpers for the min/max editor. Only input validation lives here (the backend validates again);
// no business numbers are computed on the client.

export type PolicySuggestionItem = PolicySuggestion["items"][number];

/** What the user typed for one product, plus the values it started from (to know if it really changed). */
export type PolicyEdit = { min: string; max: string; baseMin: number; baseMax: number };

export type PolicyErrors = { min?: string; max?: string; pair?: string };

export const isDirty = (e: PolicyEdit): boolean => e.min.trim() !== String(e.baseMin) || e.max.trim() !== String(e.baseMax);

const parseInteger = (v: string): number | null => (/^\d+$/.test(v.trim()) && Number.isSafeInteger(Number(v)) ? Number(v) : null);

/** Integers, 0 <= min <= max. Messages in Spanish. */
export function validateEdit(e: PolicyEdit): PolicyErrors {
  const min = parseInteger(e.min);
  const max = parseInteger(e.max);
  const errors: PolicyErrors = {};
  if (min === null) errors.min = copy.products.invalidNumber;
  if (max === null) errors.max = copy.products.invalidNumber;
  if (min !== null && max !== null && min > max) errors.pair = copy.products.minGtMax;
  return errors;
}

export const hasErrors = (e: PolicyErrors): boolean => !!(e.min || e.max || e.pair);

/** Edit that applies a backend suggestion; `null` when it would not change anything. */
export function editFromSuggestion(s: PolicySuggestionItem): PolicyEdit | null {
  const edit: PolicyEdit = {
    min: String(s.suggested.reorder_point),
    max: String(s.suggested.max_stock),
    baseMin: s.current.reorder_point,
    baseMax: s.current.max_stock,
  };
  return isDirty(edit) ? edit : null;
}
