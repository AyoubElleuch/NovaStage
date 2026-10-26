# Canvas generation rebuild (1.1.5)

## Audit and reproduced failures

Built-in requests enter the authenticated `ai-generate` route: membership, project generation lock and quota precede context loading, decomposition, mode-specific Gemini generation, validation, reconciliation and database writes. Decomposition supplies requirements; generation supplies resources/tasks and relationships. AWS quality evaluation has one correction attempt. Workflow previously substituted an offline canned roadmap.

MCP requests enter the authenticated canvas MCP route and save the selected mode in a draft. The MCP server reads the request, publishes the mode-specific schema and accepts `propose_workflow` through `prepareWorkflow`. Acceptance revalidates the saved payload against the queued mode, constructs a complete graph, then calls migration 025's transactional `apply_canvas_mcp_draft`. That function locks draft/project rows, checks access, mode and active generation, rebases against existing work, and commits acceptance with the graph. External diagrams always append.

`auto-layout` owns recursive containment, ranking, positions and group extents. `coordinate-math` supplies renderer, viewport and handle dimensions. `architecture-routing` supplies orthogonal visibility routes; `canvas-edge-layer` renders connections/labels. Reconciliation owns existing UUID/checkpoint matching and persistence.

Six executable regressions failed before implementation: orphan validation invented an edge; workflow cycles were silently deleted; cyclic and contradictory group membership was accepted; equivalent MCP input changed position because random UUIDs broke layout ties; and layout replaced a rendered 252px milestone with an arbitrary 300px box. Before screenshots also show wrong STEP numbering (03 between 01 and 02), unnecessarily empty cards, and unreadable single-line task previews.

## Implemented contract

Semantic validation precedes topology normalization. Invalid references, duplicate IDs, mode mixtures, containment conflicts/cycles, unsupported managed-service placement, oversized graphs and cyclic workflow dependencies fail with actionable errors. Neither provider may invent checkpoints, dependencies or resource IDs to repair a draft. AWS feedback loops remain valid. Workflow and AWS generation each have at most one correction attempt. Network/offline failure cannot report a canned workflow as successful generation. Decomposition and generation receive the authoritative selected mode and operation.

The shared generated graph builder uses semantic IDs during deterministic layout and assigns persistence UUIDs afterward. Content-aware dimensions are shared with the actual renderer, including the bounded title/checkpoint preview; additional content remains accessible in details. Step numbering follows layout ranks, including the public viewer. Groups grow recursively and reserve header space; long headers wrap. Both node families use orthogonal routing around cards and header bands, with labels centered on straight segments. A final geometry gate checks finite rectangles, rendered dimensions, endpoints, containment, separation, routes and collisions with existing content before persistence.

Built-in reconciliation now builds the entire desired mutation in memory and calls `apply_canvas_ai_graph` once. Migration 026 checks access, active generation ownership, mode, retained-node versions and claims, then writes nodes, checkpoints, containment and connections together. Any failure rolls back. Completed checkpoints and claim ownership survive updates. Explicit deletions are restricted to the selected mode. The affected graph retains its anchor and saved sizes as minimums, while unrelated work stays in place. Updates reflow the affected graph, consistent with the existing auto-layout contract; an expansion into unrelated work fails safely.

MCP review includes a production-card thumbnail, the selected mode, card/connection counts and geometry diagnostics. The preview and accepted graph share placement code; acceptance rebases the diagram beside existing content under its existing lock. Geometry is also checked before a ready proposal is saved. The former 15% viewport floor has been removed so large generated diagrams actually fit on phones.

## Evidence and validation

`src/lib/canvas/generation-regression.test.ts` records the six original failures. `scripts/test-generation-browser.mjs` mounts real canvas cards, groups, edges, viewport and details with generated workflow, serverless, nested and feedback fixtures at desktop/phone sizes in both themes. It uses local fixture graphs and forbids API requests. Screenshots are written under `.tmp/generation-before` and `.tmp/generation-after`; no credentials, paid calls, migrations or real diagrams are involved.

## Visual evidence

| Case | Before | After |
| --- | --- | --- |
| Workflow, desktop/light | [Screenshot](canvas-generation-evidence/workflow-before.png) | [Screenshot](canvas-generation-evidence/workflow-after.png) |
| Nested AWS, phone/light | [Screenshot](canvas-generation-evidence/nested-phone-before.png) | [Screenshot](canvas-generation-evidence/nested-phone-after.png) |

Workflow screenshots show dependency-based STEP 01 → 02 → 03 numbering, smaller short-content cards, three-line titles, two-line checkpoint previews and orthogonal branches. The phone comparison shows the complete nested graph within the viewport instead of clipping at the former minimum zoom. These are real production card/edge components, with fixture APIs and local data.

Additional inspected evidence: [serverless AWS in dark theme](canvas-generation-evidence/serverless-dark.png), [all nine long checkpoints in phone details](canvas-generation-evidence/workflow-details-phone-dark.png), and [MCP review thumbnail](canvas-generation-evidence/mcp-draft-preview.png). The reproducible browser harness captures five scenarios in both themes at 1440×1000 and 390×844, plus four details screenshots. Assertions check full fit, rendered content height, zoom, keyboard pan, details and absence of API requests.

## Validation and deployment

- Full Vitest suite: **218 passing** across 37 files. This includes the original six regressions, both providers' mode guards, bounded correction, AWS feedback/containment, shuffled equivalence, dependency ranks, 60-milestone/100-service graphs, appends, update identity/completion, preview parity, and embedded PostgreSQL execution of migrations 025 and 026.
- AWS layout/provider command: **21 passing**; geometry preview command: **7 passing** and gallery generated.
- Actual canvas browser suite: **26 checks passing**. Generated diagram browser suite: **20 scenario/theme/viewport combinations passing**, plus four long-details screenshots.
- TypeScript and production webpack build passed. Plain `npm run lint` encounters errors in the pre-existing untracked promo directories; `npm run lint -- --ignore-pattern 'promo-*/**'` passes for tracked application/tooling source. Those unrelated directories were preserved.
- Browser output includes the existing Vite/React warning about Next's `style jsx` attribute; no page errors were recorded. Build output includes the existing package-lock tracing warning for a parent directory.

Install **migration 026** after 023–025 before deploying this implementation. No migration was deployed, no real project data was changed, and no paid model quota was used. This work is released as 1.1.5; 1.1.4 history is preserved.

## Remaining limits

Routing does not globally minimize crossings or allocate distinct lanes to every connection. Dense paths and labels can still share space; manually overlapping cards retain a curved fallback. Previews intentionally clamp long text, with full content in details. Large phone layouts are overviews requiring zoom/pan for individual resources. Update operations reflow the affected diagram around its anchor rather than preserving every individual manual position; unrelated diagrams remain untouched. Existing saved canvases are not automatically resized or rearranged. Native Codex/Claude execution and live model fidelity require a separate user-run integration check.
