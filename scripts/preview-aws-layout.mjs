import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createServer } from "vite";

// Optional visual gallery; exhaustive fixtures no longer run repeatedly in the unit suite.
const output = resolve(".tmp/aws-layout-preview.html");
const server = await createServer({ configFile: false, resolve: { alias: { "@": resolve("src") } }, server: { middlewareMode: true } });
try {
  const { AWS_ARCHITECTURE_FIXTURES } = await server.ssrLoadModule("/src/lib/canvas/__fixtures__/aws-architectures.ts");
  const { buildGeneratedGraph } = await server.ssrLoadModule("/src/lib/canvas/generated-graph.ts");
  const { routeArchitectureEdge } = await server.ssrLoadModule("/src/lib/canvas/architecture-routing.ts");
  const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const gallery = AWS_ARCHITECTURE_FIXTURES.map(({ name, result }) => {
    const graph = buildGeneratedGraph(result, []);
    const width = Math.max(...graph.nodes.map(node => node.position_x + node.width)) + 40;
    const height = Math.max(...graph.nodes.map(node => node.position_y + node.height)) + 40;
    const nodes = graph.nodes.map(node => `<rect x="${node.position_x}" y="${node.position_y}" width="${node.width}" height="${node.height}" rx="12" fill="${node.node_type === "group" ? "#ecfdf5" : "white"}" stroke="#10b981"/><text x="${node.position_x + 12}" y="${node.position_y + 24}" font-size="14">${escape(node.title)}</text>`).join("");
    const edges = graph.edges.map(edge => {
      const source = graph.nodes.find(node => node.id === edge.source_node_id), target = graph.nodes.find(node => node.id === edge.target_node_id);
      const route = routeArchitectureEdge(source, target, edge.source_handle, edge.target_handle, graph.nodes);
      return route ? `<path d="${route.path}" fill="none" stroke="#64748b" stroke-width="2"/>` : "";
    }).join("");
    return `<section><h2>${escape(name)}</h2><svg viewBox="0 0 ${width} ${height}" width="100%">${nodes}${edges}</svg></section>`;
  }).join("");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `<!doctype html><meta charset="utf-8"><title>AWS layout gallery</title><style>body{font:16px system-ui;margin:32px;background:#f5f5f5}section{background:white;padding:24px;margin-bottom:24px;border-radius:16px}svg{max-height:750px}text{fill:#171717}</style>${gallery}`);
  console.log(`AWS layout gallery: ${output}`);
} finally { await server.close(); }
