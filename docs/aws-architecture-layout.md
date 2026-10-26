# AWS architecture generation and layout

The provider supplies meaning: canonical catalog service IDs, labels, configuration, semantic boundaries and directed connections. Application code owns card dimensions, theme tokens, containment geometry, ordering and routes. Both built-in generation and MCP use the same semantic validator and generated graph builder.

Validation rejects duplicate IDs, unknown services, dangling connections, mixed modes, conflicting membership, containment cycles and invalid supported infrastructure placement. Regional managed services are not moved into VPC/subnet/AZ boundaries to improve appearance. Explicit parent membership and group child lists may each supply membership, but contradictions fail. Normalization canonicalizes aliases, deduplicates identical connections, rebuilds direct child lists and removes empty boundaries. It never invents resources or connectivity. AWS feedback loops remain intact. Model generation has at most one correction attempt.

The layout computes the dimensions used by real cards and places groups recursively from the inside out. Global service flow orders children with cross-boundary connections. If collapsing descendants creates an artificial cycle, only its forward projection influences layout; original edges are retained. Disconnected and operational/security resources occupy deterministic shelves. Ingress cards align to their actual destinations. Layout runs with semantic IDs before persistence assigns UUIDs, so equivalent shuffled input has stable geometry. New diagrams append beyond the rendered bounds of existing content.

Architecture and workflow connections share orthogonal routing with a visibility graph around card rectangles and group header bands. Handles use rendered dimensions. Labels sit on the longest straight route segment. The final generation gate checks rectangles, rendered content size, containment, gaps, dangling endpoints, routes and collisions with existing work before writing. Manual overlapping cards retain the existing curved fallback when no safe route exists.

Built-in updates reconcile existing UUIDs and checkpoints in memory before one transactional write. Completed checkpoints and claims remain intact. Retained cards keep their saved dimensions as minimums, and the affected graph keeps its canvas anchor. Its cards are laid out again; unrelated diagrams and their positions are preserved. Expansion into unrelated content fails instead of moving other work. The RPC checks versions, claims, generation lock, access and selected mode again. See migration 026; it must be installed before using the new built-in persistence path. MCP acceptance continues using migration 025's transaction and additive behavior.

Run these offline tools:

- `npm run test:aws-layout`: provider/topology/layout/routing fixtures, including single service, static website, three-tier VPC, serverless feedback, multi-AZ and multi-region designs.
- `npx vitest run src/lib/canvas/generation-regression.test.ts`: workflow branches/joins, disconnected tracks, shuffled input, rendered dimensions, preview/acceptance parity, safe appends and permitted large graphs (60 milestones and 100 services).
- `npm run preview:aws-layout`: simplified geometry gallery at `.tmp/aws-layout-preview.html`.
- `npm run test:generation-browser`: actual cards, groups, connections and viewport at desktop/phone sizes in light/dark themes, including long-content details and appending to a populated canvas. Screenshots at `.tmp/generation-after`.
- `npm run test:canvas-browser`: interactive canvas, assistant, mode selection, MCP draft preview/acceptance, touch navigation and keyboard tests with mocked APIs.

There is no global crossing minimizer or connection-label collision solver. Dense connections can share channels, and labels can overlap other labels. Long content uses bounded card previews with full text in details. A very large graph fits as an overview on phones; zoom, pan and details provide readable inspection. Live model adherence and native external-assistant execution are not established by mocked browser/provider tests. Existing saved canvases are not automatically migrated or rearranged.

See [the rebuild report and before/after screenshots](canvas-generation-rebuild.md).
