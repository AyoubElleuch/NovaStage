# NovaStage AI Context

Read this file before changing the project. Keep it current when architecture, database schema, or workflows change.

## Project

- Next.js 16.3.1 App Router with React 19, TypeScript, Tailwind CSS 4, and Supabase.
- `/` redirects to `/login`.
- `/login` is the public waitlist page: email signup and GitHub signup use the existing visual design. The page also has an inline animated `Log in` mode for approved users, with email/password and GitHub login.
- Auth code lives in `src/app/auth/`; Supabase clients live in `src/lib/supabase/`.
- `middleware.ts` refreshes Supabase sessions. Do not expose the service-role key to client code.
- Database migrations live in `supabase/migrations/`. Current public tables are `profiles`, `waitlist`, `permissions`, `roles`, `role_permissions`, `user_roles`, `projects`, `project_members`, `canvas_nodes`, `canvas_checkpoints`, `canvas_edges`, and `canvas_claim_requests`; `auth.users` is managed by Supabase and must never be deleted by development cleanup.
- Granular permissions and roles live in `src/lib/auth/permissions.ts` and `src/lib/auth/session.ts`.
- `public/images/` and `public/videos/login_page.mp4` are intentional login-page assets.

## User Hierarchy & Permissions (RBAC / PBAC)

- Roles (`super_admin`, `admin`, `developer`, `viewer`) and granular permissions (`admin:access`, `waitlist:read`, `waitlist:approve`, `waitlist:disapprove`, `waitlist:delete`, `users:read`, `users:manage`, `roles:manage`) live in `permissions`, `roles`, `role_permissions`, and `user_roles`.
- `super_admin` has full system access and bypasses permission checks.
- Server route/action guards: `requireAdmin()`, `requirePermission(perm)` in `src/lib/auth/session.ts` and `hasPermission(perms, perm)` in `src/lib/auth/permissions.ts`.
- PostgreSQL security functions: `public.has_permission(auth.uid(), '...')` and `public.has_role(auth.uid(), '...')` back RLS policies.
- New users automatically receive the default `developer` role via the `handle_new_user()` trigger.

## Projects & Collaboration Canvas Architecture

- **`projects` & `project_members`**: Membership join table with `owner` and `collaborator` roles, non-recursive RLS `is_project_member()`.
- **Canvas System**:
  - `canvas_nodes`: Milestone boxes containing position, size, status, and atomic exclusive edit locks (`claimed_by`, `claimed_at`, `claim_expires_at`, `version`).
  - `canvas_checkpoints`: Sub-tasks with boolean completion states (`is_completed`), sort orders, and completion metadata. Live completion percentage automatically updates the milestone node.
  - `canvas_edges`: Dependency links between nodes. When a prerequisite node reaches 100% completion (all checkpoints done), the link transitions into an energized neon glow with animated flow.
  - `canvas_claim_requests`: Real-time collision-prevention handoff queue. If User B requests a claim on User A's node, User A receives an interactive toast to Grant or Decline the claim.
  - **Zero-Collision Concurrency & Instant Peer Sync**: Only the user holding the claim lock can edit a node's details or checkpoints. Realtime broadcast events (`claim:changed`, `node:updated`, `checkpoint:toggled`) provide instant sub-50ms peer state synchronization. 60-second client heartbeats extend the lease; autonomous 2.5s client tickers release expired locks.
  - **Network Resilience & Multiplayer Physics**: Adaptive 35Hz cursor transmission with distance gating, 60fps requestAnimationFrame exponential spring-lerp interpolation engine, velocity dead-reckoning for delayed packets/jitter, stale cursor fade-out, and HUD network latency monitoring (`online`, `slow`, `reconnecting`, `offline`) with automatic state resync on recovery.
- **Frontend & Navigation**:
  - `src/app/dashboard/projects/[slug]/page.tsx`: Full-bleed collaborative infinite canvas workspace.
  - `src/components/canvas/`: Viewport, nodes, bezier edge layer with neon filters, floating action dock, right-hand milestone inspector drawer, network health pill, and physics-interpolated multiplayer cursors.
  - The canvas project notebook provides separate Notes and Questions tabs. Entries are private to the current browser and stored in `localStorage` by project ID.
  - `/dashboard/updates` is the authenticated product release timeline and is linked from the dashboard sidebar.

## Commands

- `npm run dev` starts development.
- `npm run lint` runs ESLint.
- `npm run build` runs the production build and type check.
- `npm run admin:create -- --email <email> --password <password> [--name <name>]` creates/promotes a Super Admin in Supabase Auth, updates `profiles.role`, and assigns `super_admin` in `user_roles`.
- `npm run db:scrub -- --confirm` removes all rows from the data tables listed in `scripts/scrub-database.mjs` while preserving Supabase `auth.users`. It is development-only and refuses `NODE_ENV=production`.
- `/admin` & `/admin/waitlist` provide Super Admin & Admin management of waitlist user approvals, disapprovals, and user lifecycle. Protected by `requireAdmin()`.
- `/dashboard` is the authenticated developer workspace protected by `requireAuth()`.

## Notifications

- The reusable client notification system lives in `src/components/notifications/notification-provider.tsx` and is mounted by the root layout.
- Client components call `useNotifications().notify({ title, message?, detail?, copyText?, tone? })`; use `tone: "error"` for failures and omit it for success notifications.
- Notifications use a light surface, appear at the bottom-right, auto-dismiss after three seconds, and support manual dismissal and optional copyable detail text.
- Hovering a visible notification pauses its timer. Moving the pointer away starts a fresh three-second countdown; this applies only to notifications that have not already been selected for overflow removal.
- At most two notifications remain visible. New notifications are appended at the bottom; when a third arrives, the oldest visible notification exits immediately before the remaining notifications shift upward.

## Admin Design Principles

- Prefer useful labels and direct hierarchy over decorative context labels, category eyebrows, or generic workspace headings.
- Keep repeated controls aligned to a shared axis; compact account and sign-out controls should not create unnecessary vertical gaps.
- Use restrained, consistent color for summary metrics unless color communicates a necessary state or action.
- Keep navigation states full-width and intentional, with compact typography and no ornamental UI added only to make a surface feel more designed.

## Rules For Future Changes

- Read this file and the relevant local Next.js guide in `node_modules/next/dist/docs/` before coding.
- Preserve the current waitlist-first login experience unless the product request changes it.
- For database changes, add a numbered migration under `supabase/migrations/` and update the `tables` list in `scripts/scrub-database.mjs` in the same change when a new data table is added or renamed. Never add `auth.users` or any other table in the `auth` schema.
- Never add `auth.users` to a truncate/delete list. Never use `SUPABASE_SERVICE_ROLE_KEY` in client components or browser code.
- Keep redirects internal paths only. Run `npm run lint`, `npm run build`, and `npm run db:scrub -- --confirm` only against a development database after relevant changes.
- Do not delete intentional assets or utilities merely because they are not currently referenced; make cleanup only when it removes a real defect or accidental artifact.
- Prefer the shared notification provider for transient action feedback instead of adding new page-level alert banners.

## Confirmation Dialogs

- The reusable confirmation dialog lives in `src/components/confirmation-dialog.tsx`.
- Use it for destructive client actions instead of `window.confirm()`; it provides focus trapping, Escape/backdrop dismissal, body-scroll locking, and a disabled loading state while the action is running.
