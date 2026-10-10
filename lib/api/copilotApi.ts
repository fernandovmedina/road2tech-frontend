// Typed client for the Copilot API REST endpoints (through the same-origin /api/backend proxy).
// TODO(backend): point COPILOT_API_URL at API Gateway once the Lambda deployment exists.
import type { ApiEnvelope, ApiError, DraftStatus, StoreRef } from "@/types/copilot";

export class CopilotApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/backend/${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as Partial<ApiError> | null;
    throw new CopilotApiError(error?.message ?? "Request failed.", error?.code ?? "error");
  }
  return body as ApiEnvelope<T>;
}

export const fetchStores = (): Promise<ApiEnvelope<StoreRef[]>> => request<StoreRef[]>("stores");

export type DraftSummary = { draft_id: string; status: DraftStatus; title: string };

export const setDraftStatus = (
  draftId: string,
  action: "approve" | "reject" | "add-to-plan",
  note?: string,
): Promise<ApiEnvelope<DraftSummary>> =>
  request<DraftSummary>(`drafts/${encodeURIComponent(draftId)}/${action}`, {
    method: "POST",
    body: JSON.stringify({ actor: "store-manager", note: note ?? null }),
  });
