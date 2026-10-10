import { MockHttpError } from "../errors";
import type { MockRoute } from "../router";

// Mock "backend" for POST /assistant/product-comparison (docs/backend-contract.md §3.19). The real Lambda queries Brave
// Search; until it is deployed this handler asks the same-origin route app/api/market-comparison, which keeps the Brave key
// on the server. Unlike the other mock handlers its data is real (external search results): without a key it answers with
// an error instead of inventing competitor prices.
// TODO(backend): drop this handler once the Lambda is routed with NEXT_PUBLIC_API_HTTP_PATHS.

const UNAVAILABLE = "No se pudo consultar la comparación de mercado.";

export const routes: MockRoute[] = [
  {
    method: "POST",
    path: "/assistant/product-comparison",
    handler: async ({ body }) => {
      let res: Response;
      try {
        res = await fetch("/api/market-comparison", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
      } catch {
        throw new MockHttpError(503, "market_unavailable", UNAVAILABLE);
      }
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const failure = (data ?? {}) as { code?: unknown; message?: unknown };
        throw new MockHttpError(
          res.status,
          typeof failure.code === "string" ? failure.code : "market_unavailable",
          typeof failure.message === "string" ? failure.message : UNAVAILABLE,
        );
      }
      return data;
    },
  },
];
