// Same-origin proxy to the Copilot API REST endpoints, so the browser never needs CORS or the
// backend URL. Only the read/approval routes the UI uses are allowed through.
import type { NextRequest } from "next/server";

const COPILOT_API_URL = process.env.COPILOT_API_URL ?? "http://localhost:8000";
const ALLOWED = [/^meta$/, /^stores$/, /^stores\/S\d{3}\/(overview|tendency|restock|plan)$/, /^drafts(\/[\w-]+)?$/, /^drafts\/[\w-]+\/(approve|reject|add-to-plan)$/];

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  const joined = path.join("/");
  if (!ALLOWED.some((pattern) => pattern.test(joined))) {
    return Response.json({ code: "not_found", message: "Unknown endpoint.", request_id: "" }, { status: 404 });
  }
  const url = `${COPILOT_API_URL}/${joined}${request.nextUrl.search}`;
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers: { "content-type": "application/json", "x-request-id": request.headers.get("x-request-id") ?? "" },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json(
      { code: "backend_unavailable", message: "The Copilot API is not reachable.", request_id: "" },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
