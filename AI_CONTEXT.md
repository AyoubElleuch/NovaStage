# NovaStage AI Context

Read this file before changing the project. Keep it current when architecture, database schema, or workflows change.

## Project

- Next.js 16.3.1 App Router with React 19, TypeScript, Tailwind CSS 4, and Supabase.
- `/` redirects to `/login`.
- `/login` is the public waitlist page: email signup and GitHub signup use the existing visual design. The page also has an inline animated `Log in` mode for approved users, with email/password and GitHub login.
- Auth code lives in `src/app/auth/`; Supabase clients live in `src/lib/supabase/`.
- `middleware.ts` refreshes Supabase sessions. Do not expose the service-role key to client code.
- Database migrations live in `supabase/migrations/`. Current public tables are `profiles` and `waitlist`; `auth.users` is managed by Supabase and must never be deleted by development cleanup.
- `public/images/` and `public/videos/login_page.mp4` are intentional login-page assets.

## Commands

- `npm run dev` starts development.
- `npm run lint` runs ESLint.
- `npm run build` runs the production build and type check.
- `npm run db:scrub -- --confirm` removes all rows from the data tables listed in `scripts/scrub-database.mjs` while preserving Supabase `auth.users`. It is development-only and refuses `NODE_ENV=production`.

## Rules For Future Changes

- Read this file and the relevant local Next.js guide in `node_modules/next/dist/docs/` before coding.
- Preserve the current waitlist-first login experience unless the product request changes it.
- For database changes, add a numbered migration under `supabase/migrations/` and update the `tables` list in `scripts/scrub-database.mjs` in the same change when a new data table is added or renamed. Never add `auth.users` or any other table in the `auth` schema.
- Never add `auth.users` to a truncate/delete list. Never use `SUPABASE_SERVICE_ROLE_KEY` in client components or browser code.
- Keep redirects internal paths only. Run `npm run lint`, `npm run build`, and `npm run db:scrub -- --confirm` only against a development database after relevant changes.
- Do not delete intentional assets or utilities merely because they are not currently referenced; make cleanup only when it removes a real defect or accidental artifact.
