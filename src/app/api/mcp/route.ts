import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcp } from "@/lib/mcp/auth";
import { createCanvasMcpServer } from "@/lib/mcp/server";
import { isSameOriginRequest } from "@/lib/security/request-origin";
import { checkRateLimitAsync, getClientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request, process.env.NEXT_PUBLIC_APP_URL)) return new Response("Invalid origin", { status: 403 });
  // Bound unauthenticated traffic before database and Auth lookups.
  const ip = await getClientIp();
  const ingress = await checkRateLimitAsync(`mcp-ingress:${ip}`, { maxAttempts: 120, windowSeconds: 60 });
  if (!ingress.allowed) return new Response("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
  try {
    const scope = await authenticateMcp(request);
    if (!scope) return new Response("A valid canvas MCP token is required", {
      status: 401, headers: { "WWW-Authenticate": 'Bearer realm="novastage-canvas"', "Cache-Control": "no-store" },
    });
    const limit = await checkRateLimitAsync(`mcp:${scope.userId}`, { maxAttempts: 90, windowSeconds: 60 });
    if (!limit.allowed) return new Response("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
    const server = createCanvasMcpServer(scope);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 512 * 1024 });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } finally {
      await server.close();
    }
  } catch {
    return Response.json({ error: "MCP is temporarily unavailable. Check the server configuration and database migration." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

// Stateless request/response transport does not expose an SSE subscription stream.
export function GET() { return new Response(null, { status: 405, headers: { Allow: "POST" } }); }
export const DELETE = GET;
