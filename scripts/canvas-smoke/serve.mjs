// Manual visual QA against the real canvas components with disposable, in-memory data.
// No credentials, cloud calls, or production projects are used.
import { startHarness } from "./harness.mjs";
import { createApiModel, COLLABORATOR, OWNER } from "./api-model.mjs";
import { nodes, edges } from "./fixtures.mjs";

// Interactive review fixture. State lives in memory in this process and is shared by every tab, so open
// two tabs (?live and ?live&user=collab) to see collaboration. POST /__reset restores the seed data;
// /__fail/<status> makes the next API request fail; /__latency/<ms> slows every response.
const model = createApiModel({ nodes, edges });
const port = Number(process.env.PORT || 4173);
const { server, origin } = await startHarness({ port, extraPlugins: [{ name: "disposable-canvas-api", configureServer(server) {
  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.url, "http://fixture.local");
    if (url.pathname === "/__reset") { Object.assign(model, createApiModel({ nodes, edges }), { skew: 0 }); res.end("reset"); return; }
    if (url.pathname.startsWith("/__fail/")) { model.fail(() => true, { status: Number(url.pathname.split("/")[2]) || 500, json: { error: "Injected server failure" } }); res.end("armed"); return; }
    if (url.pathname.startsWith("/__latency/")) { model.latencyMs = Number(url.pathname.split("/")[2]) || 0; res.end("ok"); return; }
    if (!url.pathname.startsWith("/api/")) return next();
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const referer = req.headers.referer ? new URL(req.headers.referer).searchParams : new URLSearchParams();
    const user = referer.get("user") === "collab" ? COLLABORATOR : OWNER;
    const result = await model.handle({ method: req.method, pathname: url.pathname, body: raw ? JSON.parse(raw) : {}, user });
    if (result.network) return req.socket.destroy();
    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json");
    res.end(result.status === 204 ? undefined : JSON.stringify(result.json));
  });
} }] });
console.log(`Visual QA: ${origin}/scripts/canvas-smoke/index.html?live (also ?live&user=collab, ?empty, ?shared)`);
void server;
