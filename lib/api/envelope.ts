import { z } from "zod";

// Backend response envelope (milestones.md M0): every success carries request_id + data_as_of + data.

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({
    request_id: z.string(),
    data_as_of: isoDate,
    data,
  });

export const errorBody = z.object({
  code: z.string(),
  message: z.string(),
  request_id: z.string().optional(),
});

export type Envelope<T> = { request_id: string; data_as_of: string; data: T };

/** Error raised by the transport; `kind` lets screens pick the right message. */
export class ApiError extends Error {
  constructor(
    public kind: "network" | "unauthorized" | "server" | "invalid_response",
    message: string,
    public requestId?: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
