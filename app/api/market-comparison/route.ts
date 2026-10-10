import { z } from "zod";

// Stand-in for the backend Lambda POST /assistant/product-comparison (docs/backend-contract.md §3.19) until it is
// deployed. It keeps the Brave Search key on the server (BRAVE_SEARCH_API_KEY, never NEXT_PUBLIC_) and answers with the
// contract's market_comparison block: plain text and https links only. Brave is external evidence shown next to the
// "Plan comercial"; it never changes the plan's figures.
// The route has no login: it only reads a public search API, and the cache plus the per-minute cap bound the quota it can spend.
// TODO(backend): remove this route once the Lambda is deployed and routed with NEXT_PUBLIC_API_HTTP_PATHS.

const BRAVE_URL = "https://api.search.brave.com/res/v1/web/search";
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX_ENTRIES = 200;
const MIN_GAP_MS = 1_100; // the free plan allows one query per second
const MAX_UPSTREAM_PER_MINUTE = 30;
const TIMEOUT_MS = 6_000;
const MAX_BODY_CHARS = 2_000;

const bodySchema = z.object({
  store_id: z.string().max(40).optional(),
  product_id: z.string().max(40).optional(),
  query: z.string().trim().min(3).max(160),
});

type Item = { title: string; url: string; source: string; description: string; price_text: string | null };
type Block = { type: "market_comparison"; provider: "brave"; query: string; searched_at: string; items: Item[] };

class UpstreamError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const NO_STORE = { "Cache-Control": "no-store" };
const failure = (status: number, code: string, message: string) => Response.json({ code, message }, { status, headers: NO_STORE });

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&nbsp;": " " };

/** Search snippets as plain text: no markup, decoded entities, collapsed spaces, bounded length. */
function plain(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

const PRICE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?(?:\s?(?:MXN|pesos))?/i;

/** The first price-looking text of a result, as written there. It is evidence to read, not a number to calculate with. */
function priceText(...parts: string[]): string | null {
  const match = PRICE.exec(parts.join(" "));
  return match ? match[0].replace(/\s+/g, " ").trim() : null;
}

function toItems(payload: unknown): Item[] {
  const results = (payload as { web?: { results?: unknown } } | null)?.web?.results;
  if (!Array.isArray(results)) return [];
  const sources = new Set<string>();
  const items: Item[] = [];
  for (const raw of results) {
    const result = (raw ?? {}) as { title?: unknown; url?: unknown; description?: unknown };
    if (typeof result.url !== "string") continue;
    let url: URL;
    try {
      url = new URL(result.url);
    } catch {
      continue;
    }
    if (url.protocol !== "https:") continue;
    const source = url.hostname.replace(/^www\./, "");
    const title = plain(result.title, 140);
    if (!title || sources.has(source)) continue; // one result per site keeps the comparison varied
    sources.add(source);
    const description = plain(result.description, 240);
    items.push({ title, url: url.toString(), source, description, price_text: priceText(title, description) });
    if (items.length === 8) break;
  }
  return items;
}

/* ---------- quota protection: one upstream call per second, a per-minute cap, a short cache ---------- */

let lastUpstream = 0;
let queue: Promise<unknown> = Promise.resolve();
const recentCalls: number[] = [];
const cache = new Map<string, { at: number; block: Block }>();
const inflight = new Map<string, Promise<Block>>();

function schedule<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastUpstream + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastUpstream = Date.now();
    return job();
  });
  queue = run.catch(() => undefined);
  return run;
}

function overBudget(): boolean {
  const now = Date.now();
  while (recentCalls.length && now - recentCalls[0] > 60_000) recentCalls.shift();
  if (recentCalls.length >= MAX_UPSTREAM_PER_MINUTE) return true;
  recentCalls.push(now);
  return false;
}

async function searchBrave(key: string, query: string): Promise<Block> {
  const url = new URL(BRAVE_URL);
  url.search = new URLSearchParams({ q: query, country: "MX", search_lang: "es", count: "8", text_decorations: "false" }).toString();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new UpstreamError(504, "brave_unreachable", "Brave Search no respondió a tiempo.");
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: { code?: unknown } } | null;
    if (res.status === 401 || res.status === 403 || detail?.error?.code === "SUBSCRIPTION_TOKEN_INVALID")
      throw new UpstreamError(502, "brave_unauthorized", "Brave Search rechazó la clave. Revisa BRAVE_SEARCH_API_KEY en .env.local.");
    if (res.status === 429) throw new UpstreamError(429, "brave_rate_limited", "Brave Search limitó las consultas. Intenta de nuevo en un momento.");
    throw new UpstreamError(502, "brave_error", "Brave Search no pudo atender la consulta.");
  }
  const payload: unknown = await res.json().catch(() => null);
  return { type: "market_comparison", provider: "brave", query, searched_at: new Date().toISOString(), items: toItems(payload) };
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) {
    return failure(503, "brave_not_configured", "Falta BRAVE_SEARCH_API_KEY en .env.local (clave de Brave Search; solo la lee el servidor).");
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return failure(415, "invalid_request", "Se esperaba application/json.");
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return failure(413, "invalid_request", "La solicitud es demasiado grande.");
  const parsed = bodySchema.safeParse(parseJson(raw));
  if (!parsed.success) return failure(400, "invalid_request", "query es obligatorio (de 3 a 160 caracteres).");

  const query = parsed.data.query.replace(/\s+/g, " ");
  const cacheKey = query.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Response.json(hit.block, { headers: NO_STORE });

  try {
    let pending = inflight.get(cacheKey);
    if (!pending) {
      if (overBudget()) return failure(429, "rate_limited", "Se alcanzó el límite de consultas por minuto. Intenta de nuevo en un momento.");
      pending = schedule(() => searchBrave(key, query)).finally(() => inflight.delete(cacheKey));
      inflight.set(cacheKey, pending);
    }
    const block = await pending;
    if (block.items.length > 0) {
      if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
      cache.set(cacheKey, { at: Date.now(), block });
    }
    return Response.json(block, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof UpstreamError) return failure(e.status, e.code, e.message);
    return failure(500, "internal_error", "No se pudo completar la comparación.");
  }
}
