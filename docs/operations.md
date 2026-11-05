# Operations: deployment, checks, limitations and rollback

## Before deploying

1. Apply Supabase migrations in order through **026** (`supabase/migrations/`). 023–025 add MCP and mode enforcement; 026 adds the atomic AI canvas write function the app requires. Test them on a staging database first. This repository's tests run them only against isolated embedded PostgreSQL.
2. Environment variables: see `.env.example` (Supabase URL and keys, `NEXT_PUBLIC_APP_URL`, Gemini key, Redis, Resend). Realtime must be enabled for the project.
3. CI (`.github/workflows/ci.yml`, on `dev`, `master`, `main`): ESLint, TypeScript, Vitest, production build and the isolated browser suites.

## Checks after deploying (staging first)

The automated suites use models of the API and Realtime. They do not replace these live checks:

* Sign in; open a project; create a milestone, add and tick a checkpoint, refresh: the change persists and the header shows **Saved**.
* Two browsers, two members: edits, claims, a claim handoff and undo appear on the other side. Briefly disable one browser's network: it shows **Offline**, and on reconnect reloads.
* Built-in AI (uses real quota; use a test account): Workflow and AWS runs show the preview, apply, and **Undo** removes the result. Confirm a quota-exhausted account sees the explanation, not a sign-out.
* A removed member is returned to the dashboard.
* View-only share link opens without sign-in and cannot edit.
* Plans page and landing page show billing as not available.

## Known limitations

* No offline edit queue: edits made offline are discarded on reconnect, with an explanation.
* Positions and sizes are last-writer-wins; `version` is stored but not enforced.
* Undo history is per session and limited to 50 steps. See `docs/canvas-reliability.md`.
* Built-in AI applies immediately (with Undo); only the "Your AI" path shows a draft before adding. Only one generation per project runs at a time.
* Claim handoff requests are delivered live only.
* Billing is not live. Plans are assigned by administrators; plan pages list only enforced limits (`src/lib/plans.ts`). The dashboard subscription page still carries older comparison-table wording and should be aligned with `plans.ts` before launch.
* Each open canvas tab reads the full canvas every ten seconds to detect removal.

## Rollback

* **Application:** redeploy the previous release (Beta v1.1.5 is tag-less; use its commit `7595416` or the prior deployment on your host). The 1.1.6 changes are backward compatible with the 1.1.5 client (no new migrations), so a rollback needs no database change.
* **Database:** 1.1.6 adds no migration. Migration 026 belongs to 1.1.5; roll it back only with a tested down script, as the app fails safely without its RPC.
* After a rollback, repeat the live checks above.
