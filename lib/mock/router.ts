import { MockHttpError } from "./errors";
import { getState } from "./store";
import { routes as catalogRoutes } from "./handlers/catalog";
import { routes as opsRoutes } from "./handlers/ops";
import { routes as strategyRoutes } from "./handlers/strategy";

// Tiny in-browser router that plays the backend in mock mode. Handlers return the `data` part of the envelope;
// the client wraps it with request_id/data_as_of and validates it with the same schema as the real API.

export { MockHttpError };

export type MockContext = {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  /** "empty" demo state: list endpoints should answer with empty collections. */
  empty: boolean;
};
export type MockRoute = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Pattern like "/stores/:storeId/stock". `:name` captures one path segment. */
  path: string;
  handler: (ctx: MockContext) => unknown | Promise<unknown>;
};

const compiled = [...catalogRoutes, ...opsRoutes, ...strategyRoutes].map((r) => {
  const names: string[] = [];
  const src = r.path
    .replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === ":" ? m : `\\${m}`))
    .replace(/:([A-Za-z]+)/g, (_, n: string) => {
      names.push(n);
      return "([^/]+)";
    });
  return { route: r, re: new RegExp(`^${src}$`), names };
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockDispatch(
  method: MockRoute["method"],
  path: string,
  query: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  await sleep(300 + Math.random() * 300);
  const demo = getState().demo;
  if (demo === "error") throw new MockHttpError(500, "mock_error", "Error simulado");
  for (const { route, re, names } of compiled) {
    if (route.method !== method) continue;
    const m = re.exec(path);
    if (!m) continue;
    const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    return route.handler({ params, query, body, empty: demo === "empty" });
  }
  throw new MockHttpError(404, "not_found", `Sin ruta de ejemplo para ${method} ${path}`);
}
