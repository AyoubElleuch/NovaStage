// Shared bootstrap for the isolated canvas browser suites. It serves the real
// ProjectCanvasClient with fixture adapters; no Supabase, account or network access is used.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const root = fileURLToPath(new URL("../../", import.meta.url));
const mocks = resolve(root, "scripts/canvas-smoke/mocks.jsx");

export async function startHarness({ port = 0, extraPlugins = [] } = {}) {
  const server = await createServer({
    root, configFile: false, plugins: [react(), ...extraPlugins],
    resolve: { alias: [
      ...["@/lib/supabase/client", "@/components/notifications/notification-provider", "@/lib/canvas/sound-effects", "next/link", "next/navigation"].map(find => ({ find, replacement: mocks })),
      { find: "@", replacement: resolve(root, "src") },
    ] },
    optimizeDeps: { entries: ["scripts/canvas-smoke/main.jsx"] },
    logLevel: "warn",
    server: { host: "127.0.0.1", port, strictPort: port !== 0, watch: { ignored: ["**/.next/**", "**/.tmp/**"] } },
  });
  await server.listen();
  const origin = server.resolvedUrls.local[0].replace(/\/$/, "");
  return { server, origin, close: () => server.close() };
}
