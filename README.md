# NovaStage

Real-time collaborative canvas for engineering roadmaps and AWS architecture diagrams.

[![CI Pipeline](https://github.com/AyoubElleuch/NovaStage/actions/workflows/ci.yml/badge.svg)](https://github.com/AyoubElleuch/NovaStage/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/Beta-v1.1.5-10b981)](docs/releases/v1.1.5-pr.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

## Overview

NovaStage gives engineering teams a shared workspace for delivery planning and cloud architecture. Milestones carry actionable checkpoints and dependency connections; AWS resources carry service configuration, infrastructure boundaries and typed data-flow connections. Project permissions, editing claims and database transactions protect collaborative work.

### Capabilities

- **Collaborative canvas:** Pan, zoom, search, drag cards, inspect details and follow collaborators. PostgreSQL stores project state; Supabase realtime broadcasts interaction and editing events.
- **Delivery workflows:** Milestones, checkpoint progress, dependency validation, parallel tracks, merge points and a Release Pulse view of blocked work and readiness.
- **AWS architectures:** Search a catalog of 300+ service symbols, inspect configuration, and organize resources inside region, VPC, availability-zone and subnet boundaries.
- **Built-in generation:** A server-side Gemini pipeline decomposes requirements, generates structured content and validates it before layout. Invalid output gets a bounded correction attempt rather than invented tasks or dependencies.
- **Bring your own assistant:** Open Codex or Claude with a prepared request and temporary canvas access. Review the draft and its diagram preview before appending it. Persistent MCP connections are available under Advanced. See [MCP setup](docs/canvas-mcp.md).
- **Consistent layout:** Both generation paths share deterministic placement, content-aware card dimensions, nested group sizing, geometry checks and obstacle-aware connection routing. Workflow generation and AWS Architecture generation remain separate.
- **View-only sharing:** Project owners can enable or revoke a public canvas link. Visitors can navigate and inspect shared content without editing or viewing project membership.
- **Access controls:** Project membership, roles, row-level security, editing leases and generation locks govern protected actions.

## Beta v1.1.5

This release rebuilds canvas generation and layout: dependency-based ordering, readable long-content previews, correctly sized nested boundaries, routed connections, external draft previews and complete fit-to-canvas on phones. Built-in diagram creation and updates now commit in one transaction and preserve retained identity, completed checkpoints and editing claims.

See the [release notes](docs/releases/v1.1.5-pr.md), [technical report and before/after screenshots](docs/canvas-generation-rebuild.md), and [layout contract and limitations](docs/aws-architecture-layout.md).

**Deployment requirement:** Apply migration `026_atomic_ai_canvas_graph.sql` after migrations 001–025 before deploying this release. No existing saved canvas is automatically rearranged.

## Architecture

The Next.js App Router serves authenticated project APIs and the React canvas. Built-in generation uses the application's provider credentials and quota; external assistants use scoped MCP access and their own accounts. Both supply semantic graphs. Shared application code validates graph meaning, computes dimensions and layout, checks final geometry, and constructs the persistence payload.

Built-in writes use the transactional `apply_canvas_ai_graph` RPC. MCP acceptance uses `apply_canvas_mcp_draft`, which commits the diagram and acceptance status together and rejects duplicate acceptance. Ownership, membership, claims and generation guards are checked at protected boundaries.

| Area | Implementation |
| --- | --- |
| Framework | Next.js 16.4, React 19, TypeScript |
| UI | Tailwind CSS 4, Lucide icons, HTML cards and SVG connections |
| Data and collaboration | Supabase PostgreSQL, row-level security, realtime broadcasts |
| Leases and rate limiting | Upstash Redis with database-backed fallbacks where supported |
| Diagram semantics | Shared validation, canonical AWS catalog IDs, strict mode separation |
| Geometry | Dagre ranking, recursive containment, shared card sizing and orthogonal routes |
| Verification | Vitest, Testing Library, Playwright, embedded PostgreSQL |

### Important boundaries

Workflow dependencies must be acyclic. AWS feedback loops are legitimate and remain in the graph. Validation rejects malformed references and containment; it does not invent connectivity to make a diagram look complete. External diagrams append alongside existing work and cannot delete existing project content.

Updates reflow the affected diagram around its existing anchor; unrelated diagrams keep their positions. Dense connections can still share routes or labels. Long text uses bounded card previews, with full content in details. Large phone layouts provide an overview; zoom, pan and details support closer inspection.

## Local development

### Requirements

- Node.js 22 or newer and npm.
- A Supabase project or an isolated local Supabase instance.
- Optional Upstash Redis, Resend and built-in model credentials for the corresponding features.

### Setup

```sh
git clone https://github.com/AyoubElleuch/NovaStage.git
cd NovaStage
npm install
cp .env.example .env.local
```

Set the variables documented in `.env.example`, including the Supabase URL, anonymous key, server-only service-role key and application URL. Keep service-role, provider and Redis credentials server-side. Configure optional services only when needed.

Apply the SQL files in `supabase/migrations/` in numerical order through **026**. Migrations 023–025 support MCP connections, request modes and atomic draft acceptance; migration 026 adds atomic built-in persistence. `supabase/schema.sql` is a reference, not a replacement for subsequent migrations. Tests run their own isolated database and must not be pointed at production.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). Built-in generation needs a configured model provider; missing credentials or invalid responses return a failure without a fabricated diagram. External assistants use the setup described in [canvas-mcp.md](docs/canvas-mcp.md).

## Verification

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run test:aws-layout
npm run preview:aws-layout
npm run test:canvas-browser
npm run test:generation-browser
```

Install Chromium with `npx playwright install chromium` if needed. Browser fixtures use local data and mocked APIs without logging in, consuming paid quota or altering real projects. Screenshots and JSON results are written to `.tmp/canvas-smoke/` and `.tmp/generation-after/`; the geometry gallery is `.tmp/aws-layout-preview.html`.

The generated-diagram browser matrix covers workflow, serverless, nested, feedback and appended diagrams on desktop and phone in both themes. Geometry fixtures also cover parallel branches/joins, disconnected components, shuffled input, long content and large permitted graphs. Database tests execute production migration functions in embedded PostgreSQL and check rollback and mode enforcement. These checks do not establish live-model fidelity or production performance.

See the [browser harness README](scripts/canvas-smoke/README.md). CI configuration is in [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Repository map

```text
src/app/                 Pages, authenticated routes and canvas APIs
src/components/canvas/   Cards, groups, connections, viewport and assistant controls
src/lib/ai/              Provider orchestration, semantic validation and prompt contracts
src/lib/canvas/          Graph construction, reconciliation, dimensions, layout and routing
src/lib/mcp/             Scoped external-assistant access, proposal and acceptance
supabase/migrations/     Ordered schema and transactional write functions
scripts/canvas-smoke/    Disposable UI fixtures and browser test adapters
docs/                    Setup, release notes, technical reports and visual evidence
public/aws-icons/        Official AWS service symbols and attribution
```

For the HTTP API inventory and session-cookie authentication, see [docs/api-sdk.md](docs/api-sdk.md) and [public/openapi.yaml](public/openapi.yaml).

## License

[MIT](LICENSE).
