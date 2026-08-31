<div align="center">

# NovaStage

### Real-Time Collaborative Canvas & Multi-Phase AI Roadmap Engine

A production-grade infinite canvas built for technical teams to scaffold, coordinate, and execute complex multi-stage release roadmaps in real time. Features peer-to-peer multiplayer concurrency locks, topological DAG auto-layout with cycle detection, multi-phase AI pipeline orchestration, and database-enforced security.

[![Live Application](https://img.shields.io/badge/Live_App-novastage.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://novastage.app/)
[![Engineering Case Study](https://img.shields.io/badge/Case_Study-mohamedayoubeleuch.com-111111?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://www.mohamedayoubeleuch.com/web-projects/novastage)
[![Tests Passing](https://img.shields.io/badge/Vitest-181_Passed-22c55e?style=for-the-badge&logo=vitest&logoColor=white)](#automated-testing--quality-assurance)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](#tech-stack)

</div>

---

## Overview

Software teams often get trapped between two extremes: **static diagramming tools** (Mermaid, Miro, Excalidraw) that quickly become outdated, and **disconnected issue trackers** (Jira, Linear) that obscure the macro dependency graph.

**NovaStage** bridges this gap by combining an interactive, infinite visual canvas with real-time multiplayer state synchronization, database-enforced authorization, and an algorithmic pipeline that transforms ambiguous natural language prompts into mathematically acyclic, dependency-linked roadmaps.

---

## Architectural Highlights

```
                          ┌────────────────────────┐
                          │   Next.js 16 Client    │
                          │   (React 19, Canvas)   │
                          └───────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   [ Supabase Realtime ]     [ Next.js API Routes ]    [ PostgreSQL Engine ]
   • 35Hz Cursor Broadcast   • Multi-Phase AI (Gemini) • Non-Recursive RLS
   • Optimistic Claim Locks  • Upstash Redis Limiter   • RBAC / PBAC Tables
   • Node State Sync (<50ms) • Server Latency HUD      • Foreign Key Integrity
```

### 1. Multiplayer Concurrency & Claim-Lock Protocol
To eliminate write collisions and data loss across concurrent sessions without locking the entire canvas, NovaStage implements an **optimistic milestone-level claim-lock protocol**:
- **Atomic Locks:** Milestones maintain `claimed_by`, `claimed_at`, `claim_expires_at`, and `version` fields. Only the active leaseholder can edit milestone details, toggle checkpoints, or modify dependencies.
- **Lease Heartbeats & Client Tickers:** Active claims maintain a 60-second sliding lease refreshed via client heartbeats. An autonomous 2.5s client ticker seamlessly cleans up stale abandoned locks if a collaborator disconnects.
- **Real-Time Handoff Queue:** When User B requests access to a milestone held by User A, User A receives an interactive, non-blocking toast to **Grant** or **Decline** the transfer, triggering immediate peer handoffs over Supabase Realtime channels.

### 2. Network Resilience & Multiplayer Physics
- **Spring-Lerp Interpolation:** Remote cursor movements avoid jitter using an adaptive 35Hz broadcast rate paired with a 60 FPS `requestAnimationFrame` exponential spring-lerp loop (`1 - exp(-24 * dt)`).
- **Dead-Reckoning Extrapolation:** Integrated a 45ms–160ms velocity dead-reckoning buffer to mask packet delay and network jitter during rapid cursor movements.
- **Server Round-Trip Latency Monitoring:** The real-time HUD computes continuous HTTP server round-trip latency (`online`, `slow`, `reconnecting`, `offline`) and triggers automated client reconciliation upon reconnection.

### 3. Graph Theory & Topological DAG Layout Engine
- **Acyclic Dependency Layout:** Implemented a custom topological level-assignment algorithm (`src/lib/canvas/auto-layout.ts`) with cycle-safety guards that automatically groups milestone nodes into balanced visual dependency columns.
- **Real-Time Cycle Prevention:** Interactive edge connections run in-memory Depth-First Search (DFS) cycle detection during drag interactions, preventing circular dependencies before they reach the database.
- **Dynamic Bézier Geometry:** Renders hardware-accelerated SVG cubic Bézier curves with exact midpoint calculations and a 28px magnetic snap threshold. Links reactively transition into animated neon pulsing flows once prerequisite milestones reach 100% checkpoint completion.

### 4. Multi-Phase AI Roadmap Pipeline
Instead of relying on single unconstrained LLM calls that hallucinate invalid graphs or produce flat lists, NovaStage uses a **3-phase orchestration pipeline** (`src/lib/ai/`):
1. **Domain Decomposition:** Analyzes project requirements, decomposes scopes, and identifies parallel architectural tracks.
2. **Branching DAG Generation:** Translates decomposed concerns into milestone nodes with 4–9 granular, actionable checklist subtasks and forward dependency links.
3. **Algorithmic Validation & Auto-Repair:** Local deterministic validation runs DFS cycle elimination, reconnects orphan nodes, and cleans broken foreign keys before saving to PostgreSQL.
- **Resilient Quota Management:** Includes atomic quota checks and automated parameterless quota restoration (`restore_user_ai_quota`) if external LLM providers fail or timeout.

### 5. Database-Enforced Security & Authorization (RLS / PBAC)
- **Zero Client-Side Trust:** Security boundaries are enforced at the PostgreSQL engine level using Row-Level Security (RLS) policies.
- **Non-Recursive Helper Functions:** Custom SQL functions (`public.has_permission()`, `public.is_project_member()`) eliminate recursive RLS query bottlenecks and prevent privilege escalation.
- **Granular 4-Tier RBAC:** Structured access across `super_admin`, `admin`, `developer`, and `viewer` roles with granular permission flags (`admin:access`, `waitlist:read`, `waitlist:approve`, `users:manage`).
- **Distributed Sliding-Window Rate Limiting:** Sensitive endpoints (authentication, AI generation, project invites) are protected via Upstash Serverless Redis sorted-set pipelines (`ZREMRANGEBYSCORE`, `ZCARD`, `ZADD`, `EXPIRE`) with graceful, resilient fallback to in-memory caches.

### 6. Tactile UI & Sensory Engineering
- **Web Audio Synthesis:** Custom synthetic audio feedback generated through the Web Audio API for milestone creations, deletions, and checkpoint completions.
- **Interactive Tooling:** Marquee multi-selection, zoom/pan infinite stage, contextual milestone drawer, radar minimap, and instant Mermaid.js diagram export.
- **Release Pulse:** A live execution-intelligence panel calculates task-weighted readiness, the longest unfinished dependency chain, high-impact blockers, and milestones that are actionable now. Every insight links directly back to its canvas node.

---

## Automated Testing & Quality Assurance

NovaStage maintains a comprehensive test harness across unit, integration, and security layers.

```bash
npm test
```

```text
 ✓ src/lib/canvas/coordinate-math.test.ts (34 tests)
 ✓ src/lib/auth/permissions.test.ts (14 tests)
 ✓ src/lib/projects.test.ts (9 tests)
 ✓ src/components/canvas/canvas-ai-assistant.test.tsx (9 tests)
 ✓ src/components/terms/terms-of-service-modal.test.tsx (9 tests)
 ✓ src/components/privacy/privacy-policy-modal.test.tsx (9 tests)
 ✓ src/lib/auth/session.test.ts (8 tests)
 ✓ src/components/canvas/canvas-hud.test.tsx (8 tests)
 ✓ src/app/onboarding/onboarding.test.tsx (8 tests)
 ✓ src/app/admin/ai-limits/ai-limits.test.tsx (7 tests)
 ✓ src/lib/security/rate-limit.test.ts (6 tests)
 ✓ src/lib/ai/phases/validate.test.ts (6 tests)
 ✓ src/lib/canvas/sound-effects.test.ts (6 tests)
 ✓ src/lib/ai/ai-generate.test.ts (6 tests)
 ✓ src/lib/redis/client.test.ts (6 tests)
 ✓ src/lib/email/email.test.ts (5 tests)
 ✓ src/components/canvas/canvas-node.test.tsx (4 tests)
 ✓ src/lib/canvas/auto-layout.test.ts (4 tests)
 ✓ src/components/canvas/canvas-minimap.test.tsx (3 tests)
 ✓ src/components/canvas/canvas-notebook.test.tsx (3 tests)
 ✓ src/components/notifications/notification-provider.test.tsx (3 tests)
 ✓ src/app/api/dashboard/projects/[slug]/canvas/ai-generate/route.test.ts (3 tests)
 ✓ src/lib/canvas/ai-reconcile.test.ts (2 tests)
 ✓ src/lib/canvas/release-pulse.test.ts (4 tests)
 ✓ src/components/canvas/canvas-release-pulse.test.tsx (1 test)
 ✓ src/components/icons.test.tsx (2 tests)
 ✓ src/app/api/ping/ping.test.ts (2 tests)

Test Files  27 passed (27)
    Tests  181 passed (181)
```

---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Framework & Runtime** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & Motion** | [Tailwind CSS v4](https://tailwindcss.com/), CSS Modules, Hardware-Accelerated SVG |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 15, SSR Auth, Row-Level Security, Realtime WebSockets) |
| **Caching & Rate Limiting** | [Upstash Redis](https://upstash.com/) (Serverless Sorted-Sets Sliding-Window Pipelines) |
| **AI Orchestration** | [Google Gemini API](https://ai.google.dev/) (`gemini-3.7-flash`), Optional OpenAI (`gpt-4o-mini`) |
| **Testing Harness** | [Vitest](https://vitest.dev/), React Testing Library, JSDOM |
| **Audio & Exports** | Web Audio API, Mermaid.js |
| **Email & Transports** | [Resend](https://resend.com/) API |

---

## Project Structure

```text
novastage/
├── scripts/                      # Database maintenance & admin CLI utilities
│   ├── create-super-admin.mjs    # Interactive Super Admin promotion CLI
│   ├── scrub-database.mjs        # Safe non-auth dev DB reset script
│   └── test-redis.mjs            # Upstash Redis connectivity & pipeline validation
├── src/
│   ├── app/                      # Next.js App Router (pages & server routes)
│   │   ├── admin/                # Admin portal (waitlist, RBAC, AI quotas)
│   │   ├── api/                  # REST endpoints (AI generation, ping, webhooks)
│   │   ├── auth/                 # Server actions for signup, login, onboarding
│   │   └── dashboard/            # Full-bleed authenticated canvas workspace
│   ├── components/
│   │   ├── canvas/               # Viewport, nodes, bezier edge layers, HUD, minimap
│   │   ├── notifications/        # Client notification queue & stacked toasts
│   │   └── terms/                # Modals, policies, and onboarding step flows
│   └── lib/
│       ├── ai/                   # 3-phase AI prompt decomposition & repair engine
│       ├── auth/                 # Session verification, RBAC rules, PBAC matrices
│       ├── canvas/               # Coordinate math, auto-layout, audio FX, server sync
│       ├── redis/                # Upstash client singleton & distributed ratelimits
│       ├── security/             # Token-bucket & sliding-window rate limiters
│       └── supabase/             # Server, client, and middleware Supabase instances
└── supabase/
    ├── migrations/               # Numbered, idempotent SQL migration history
    └── schema.sql                # Complete consolidated database schema & RLS policies
```

---

## Getting Started Locally

### 1. Prerequisites
- **Node.js**: v20.x or v22.x
- **npm** or **pnpm**
- A free [Supabase](https://supabase.com/) project
- *(Optional)* A free [Upstash Redis](https://upstash.com/) database
- *(Optional)* A free [Google AI Studio](https://aistudio.google.com/) API key

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/AyoubElleuch/NovaStage.git
cd NovaStage
npm install
```

### 3. Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Fill in your credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Configuration (Gemini or OpenAI)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash

# Optional: Upstash Redis (in-memory fallback activates automatically if omitted)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
```

### 4. Database Setup
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. This creates all public tables (`projects`, `canvas_nodes`, `canvas_edges`, `roles`, `permissions`, etc.), seeds base RBAC roles, and attaches non-recursive RLS security policies.

### 5. Create Super Admin User
Create your initial administrative account using the CLI helper:
```bash
npm run admin:create -- --email admin@example.com --password YourSecurePassword123! --name "Admin User"
```

### 6. Run the Test Suite
Verify that all unit, coordinate math, and security tests pass:
```bash
npm test
```

### 7. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Author & Engineering Credits

**Mohamed Ayoub Eleuch**  
Full-Stack Software Engineer · Systems, Web & Algorithms

- **Portfolio:** [mohamedayoubeleuch.com](https://www.mohamedayoubeleuch.com/)
- **GitHub:** [@AyoubElleuch](https://github.com/AyoubElleuch)
- **Direct Contact:** [mmdayoub3@gmail.com](mailto:mmdayoub3@gmail.com)

---

## License

This project is licensed under the [MIT License](LICENSE).
