# Canvas generation rebuild (1.1.4)

## Audit and reproduced failures

Built-in requests enter the authenticated `ai-generate` route: membership, project generation lock and quota precede context loading, decomposition, mode-specific Gemini generation, validation, reconciliation and database writes. Decomposition supplies requirements; generation supplies resources/tasks and relationships. AWS quality evaluation has one correction attempt. Workflow previously substituted an offline canned roadmap.

MCP requests enter the authenticated canvas MCP route and save the selected mode in a draft. The MCP server reads the request, publishes the mode-specific schema and accepts `propose_workflow` through `prepareWorkflow`. Acceptance revalidates the saved payload against the queued mode, constructs a complete graph, then calls migration 025's transactional `apply_canvas_mcp_draft`. That function locks draft/project rows, checks access, mode and active generation, rebases against existing work, and commits acceptance with the graph. External diagrams always append.

`auto-layout` owns recursive containment, ranking, positions and group extents. `coordinate-math` supplies renderer, viewport and handle dimensions. `architecture-routing` supplies orthogonal visibility routes; `canvas-edge-layer` renders connections/labels. Reconciliation owns existing UUID/checkpoint matching and persistence.

Six executable regressions failed before implementation: orphan validation invented an edge; workflow cycles were silently deleted; cyclic and contradictory group membership was accepted; equivalent MCP input changed position because random UUIDs broke layout ties; and layout replaced a rendered 252px milestone with an arbitrary 300px box. Before screenshots also show wrong STEP numbering (03 between 01 and 02), unnecessarily empty cards, and unreadable single-line task previews.

## Implemented contract

Semantic validation precedes topology normalization. Invalid references, duplicate IDs, mode mixtures, containment conflicts/cycles, oversized graphs and cyclic workflow dependencies fail with actionable errors. Neither provider may invent checkpoints, dependencies or resource IDs to repair a draft. AWS feedback loops remain valid. Workflow and AWS generation each have at most one correction attempt. Network/offline failure cannot report a canned workflow as successful generation.

The shared generated graph builder uses semantic IDs during deterministic layout and assigns persistence UUIDs afterward. Content-aware dimensions are shared with the actual renderer, including the bounded title/checkpoint preview; additional content remains accessible in details. Step numbering follows layout ranks. A final geometry gate checks finite rectangles, rendered dimensions, endpoints, containment, separation and collisions with existing content before persistence.

## Evidence and validation

`src/lib/canvas/generation-regression.test.ts` records the six original failures. `scripts/test-generation-browser.mjs` mounts real canvas cards, groups, edges, viewport and details with generated workflow, serverless, nested and feedback fixtures at desktop/phone sizes in both themes. It uses local fixture graphs and forbids API requests. Screenshots are written under `.tmp/generation-before` and `.tmp/generation-after`; no credentials, paid calls, migrations or real diagrams are involved.

See the final validation section below for release results and limitations.
