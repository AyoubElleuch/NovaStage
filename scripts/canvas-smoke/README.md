# Canvas browser smoke test

Run from the repository root:

```sh
node scripts/test-canvas-browser.mjs
```

The script uses the installed Playwright Chromium browser. If Chromium is missing,
install it with `npx playwright install chromium` before running the smoke test.

The harness mounts the real `ProjectCanvasClient` in a local Vite server. Supabase,
notifications, audio and Next's link wrapper use fixture adapters; every API request
uses an in-memory model, and non-local network requests are blocked. It requires no
account or environment variables and never changes a real project.

It checks desktop and mobile layout, fit clearance, checkpoint search and jump,
node drag persistence, inline rename, zoom and fit controls, radar dragging and
shortcut isolation, shortcut-dialog focus and mobile keyboard scrolling, and
touch pinch starting across the background and a node. Screenshots and a JSON
summary are written to the ignored `.tmp/canvas-smoke/` directory.

It also exercises owner share-link creation/copy/revocation, anonymous read-only
viewing, safe swipes over cards, and layouts at 320, 390, 430, 700 and 844 pixels.
An empty-phone flow creates and edits a milestone, adds a checkpoint and an AWS
resource, checks the AI form at a simulated keyboard height, and verifies that
generated content fits on screen. The shared viewer fails the test if it requests
a private API. AI responses in this harness are fixtures and consume no quota.

For interactive visual review, run `node scripts/canvas-smoke/serve.mjs`, then open
`http://127.0.0.1:4173/scripts/canvas-smoke/index.html`. Add `?empty` for a blank
canvas or `?shared` for the public viewer. Its API state is disposable and local.

`sharing-db.sql` validates migration 022 against a **fresh, isolated PostgreSQL
test cluster**. It creates fixture roles and a minimal projects table, then checks
token constraints, server access, denied anonymous/member reads and writes, RLS,
and cascading deletion. Run it with `psql -v ON_ERROR_STOP=1 -f
scripts/canvas-smoke/sharing-db.sql` against that isolated cluster. Do not run
this fixture bootstrap against an application or production database.

Vite does not compile Next's `style jsx` marker in the edge layer, so React may log
a harmless non-boolean `jsx` attribute warning in this isolated harness.

## First-project usability

Run `npm run test:usability-browser` for the first-project experience: empty-state guidance, the dismissible five-topic canvas guide (stored per user in `localStorage` under `novastage:canvas-guide:v1:<user id>`), connection-in-progress status and cancel, accessible dock names, and 44px touch targets at 390x844 and 320x568. Screenshots are written to `.tmp/usability/`. The main smoke suite pre-dismisses the guide so its geometry checks see the bare canvas.

## Realistic API model, collaboration and failures

`scripts/canvas-smoke/api-model.mjs` is a stateful in-memory model of the canvas routes (nodes, checkpoints, claims, edges, sharing). It mirrors the real authorization rules and response shapes (claim leases, ownership, `423` for unclaimed checkpoint edits, `success: false` answers on HTTP 200) and adds failure injection (`model.fail(...)`), latency, a movable clock (`model.advance(ms)`) and per-user identity. `mocks.jsx` implements Realtime with a `BroadcastChannel`, so two pages of one browser context collaborate, and `window.__canvasSmokeRealtime.drop()/restore()` simulates an outage.

Run `npm run test:reliability-browser` for persistence after refresh, undo/redo persistence, concurrent editing, claim handoff and races, rejected saves, offline and reconnect, Realtime recovery, lease renewal under a fake clock, removed members and a phone check. See `docs/canvas-reliability.md` for what this does and does not prove.

For interactive review run `PORT=4180 node scripts/canvas-smoke/serve.mjs` and open `/scripts/canvas-smoke/index.html?live` and `?live&user=collab` in two tabs. `?live` loads the canvas from the API (as the real page does) so a refresh shows what was persisted; `?user=collab` signs in as a non-owner. `/__reset` restores the seed data, `/__fail/<status>` fails the next request and `/__latency/<ms>` slows responses. State is shared by all tabs and lost when the process exits.

Fixture limits: it is a model of the contract, not the production stack. It has no Supabase, row-level security, Redis, auth sessions or real network behavior, and the AI and MCP endpoints are only exercised by the main smoke suite's own fixtures.

## Generated diagram matrix

Run `npm run test:generation-browser` for real cards, groups and edges built by the production graph pipeline. It covers workflow, serverless, nested, feedback and appended graphs on desktop and phone in light/dark themes, checks fit, card content height, zoom, pan and long-content details, and writes screenshots to `.tmp/generation-after/`. The main smoke suite also checks MCP draft preview and acceptance. See `docs/canvas-generation-rebuild.md` for before/after evidence and `docs/releases/v1.1.5-pr.md` for deployment requirements.
