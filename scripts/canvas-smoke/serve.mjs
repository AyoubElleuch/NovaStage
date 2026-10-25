// Manual visual QA against the real canvas components with disposable, in-memory data.
// No credentials, cloud calls, or production projects are used.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { nodes, edges } from "./fixtures.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const mocks = resolve(root, "scripts/canvas-smoke/mocks.jsx");
const state = { nodes: structuredClone(nodes), edges: structuredClone(edges), token: null };
const server = await createServer({
  root, configFile: false,
  plugins: [react(), { name: "disposable-canvas-api", configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith("/api/")) return next();
      res.setHeader("Content-Type", "application/json");
      if (req.url.endsWith("/share")) {
        if (req.method === "POST") state.token ||= "a".repeat(64);
        if (req.method === "DELETE") state.token = null;
        return res.end(JSON.stringify({ token: state.token }));
      }
      if (req.method === "GET") return res.end(JSON.stringify(state));
      if (req.method === "HEAD") return res.end();
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : {};
      if (body.action === "update_node") state.nodes = state.nodes.map(node => node.id === body.node_id ? { ...node, ...body.updates } : node);
      if (body.action === "create_node") state.nodes.push({ ...body, project_id: "canvas-smoke", status: "draft", sort_order: state.nodes.length, claimed_by: "smoke-user", version: 1, checkpoints: [] });
      if (body.action === "delete_node") state.nodes = state.nodes.filter(node => node.id !== body.node_id);
      return res.end(JSON.stringify({ success: true }));
    });
  } }],
  resolve: { alias: [
    ...["@/lib/supabase/client", "@/components/notifications/notification-provider", "@/lib/canvas/sound-effects", "next/link"].map(find => ({ find, replacement: mocks })),
    { find: "@", replacement: resolve(root, "src") },
  ] },
  optimizeDeps: { entries: ["scripts/canvas-smoke/main.jsx"] },
  server: { host: "127.0.0.1", port: 4173, strictPort: true, watch: { ignored: ["**/.next/**", "**/.tmp/**"] } },
});
await server.listen();
console.log("Visual QA: http://127.0.0.1:4173/scripts/canvas-smoke/index.html (also ?shared or ?empty)");
