# NovaStage AI Context

Read this file before changing the project. Keep it current when architecture, database schema, or workflows change.

## Project

- Next.js 16.3.1 App Router with React 19, TypeScript, Tailwind CSS 4, and Supabase.
- `/` redirects to `/login`.
- `/login` is the public waitlist page: email signup and GitHub signup use the existing visual design. The page also has an inline animated `Log in` mode for approved users, with email/password and GitHub login.
- Auth code lives in `src/app/auth/`; Supabase clients live in `src/lib/supabase/`.
- `middleware.ts` refreshes Supabase sessions. Do not expose the service-role key to client code.
- Database migrations live in `supabase/migrations/`. Current public tables are `profiles`, `waitlist`, `permissions`, `roles`, `role_permissions`, and `user_roles`; `auth.users` is managed by Supabase and must never be deleted by development cleanup.
- Granular permissions and roles live in `src/lib/auth/permissions.ts` and `src/lib/auth/session.ts`.
- `public/images/` and `public/videos/login_page.mp4` are intentional login-page assets.

## User Hierarchy & Permissions (RBAC / PBAC)

- Roles (`super_admin`, `admin`, `developer`, `viewer`) and granular permissions (`admin:access`, `waitlist:read`, `waitlist:approve`, `waitlist:disapprove`, `waitlist:delete`, `users:read`, `users:manage`, `roles:manage`) live in `permissions`, `roles`, `role_permissions`, and `user_roles`.
- `super_admin` has full system access and bypasses permission checks.
- Server route/action guards: `requireAdmin()`, `requirePermission(perm)` in `src/lib/auth/session.ts` and `hasPermission(perms, perm)` in `src/lib/auth/permissions.ts`.
- PostgreSQL security functions: `public.has_permission(auth.uid(), '...')` and `public.has_role(auth.uid(), '...')` back RLS policies.
- New users automatically receive the default `developer` role via the `handle_new_user()` trigger.

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
