# Operations: Beta v1.2.0

## Deployment order

1. Back up the database and test migrations on staging. Apply migrations through **028** in order: 026 supplies atomic AI graph writes, 027 adds atomic layout batches, and 028 adds private AI previews and acceptance. These additive migrations do not rearrange existing diagrams.
2. Configure `.env.example` values and enable Supabase Realtime. Deploy the application only after the migrations succeed. Missing functions fail closed; there is no partial-save fallback.
3. Run the regular CI workflow and the live staging release gate below before promoting to production. Local embedded PostgreSQL and browser API models do not verify a hosted deployment.

## Live staging gate

The manual **Staging release gate** workflow uses the GitHub `staging` environment. Set environment variables `STAGING_BASE_URL` and `STAGING_PROJECT_SLUG`, plus secrets `STAGING_OWNER_EMAIL`, `STAGING_OWNER_PASSWORD`, `STAGING_MEMBER_EMAIL`, and `STAGING_MEMBER_PASSWORD`. The two accounts must already be members of a disposable staging project; the first must own it. Never point this check at a customer project.

Run locally with the same environment variables:

```sh
node scripts/test-staging.mjs
```

Set `STAGING_TEST_AI=true` for the complete release gate (enabled by default in the manual workflow). This spends one test-account generation request and discards the resulting preview. The script signs in through the app, checks live cookies, access, claims, atomic layout persistence and stale rejection, restores nothing over existing work, measures 20 access requests at concurrency four, and verifies session removal. It creates two UUID-named nodes and deletes only those nodes in `finally`; a cleanup failure reports their IDs.

Also verify on staging:

- Two browser sessions receive live edits, claim handoffs and accepted previews; disconnect one session, edit, reconnect, then review and restore its draft.
- Remove a test member and verify access is revoked; restore membership afterwards. Confirm revoked public links stop working and new anonymous viewers cannot access private metadata.
- Verify one real Workflow and AWS Architecture preview, acceptance, stale-preview refusal and undo. Check provider failure/refund behavior with the staging provider configuration.
- Check expected production graph sizes and concurrent traffic against the deployment's latency/error budget. The small access probe is a smoke check, not a capacity certification.

Record the deployment revision and results before production promotion. The repository implementation work did not apply these migrations to the hosted database or execute this live gate.

## Runtime behavior and limits

- Tidy and multi-card moves commit one transaction. Node updates compare versions; conflicts preserve a local draft and refresh the shared state.
- Failed/offline edits are not silently replayed. Drafts and up to 50 undo steps are scoped to user/project in browser storage, expire after seven days, and are limited to 4 MB. If storage is unavailable, the UI offers an in-tab draft to download before leaving. Clearing browser data removes local history.
- Restoring a draft requires its starting canvas to match the current shared canvas. Otherwise download it for manual reconciliation. Undo rejects conflicting newer edits.
- Built-in AI previews expire after 15 minutes. Accepting is idempotent and uses no extra quota; completed generation consumes a request even if discarded. Expired rows are cleaned on that user's next generation; a scheduled database purge can remove expired rows for inactive accounts.
- Preview acceptance briefly locks graph tables while checking content and applying the transaction; include simultaneous acceptances in staging latency checks.
- Access polling returns 204 after membership validation, without loading graph tables. Claims renew every minute; handoff notifications remain live-only.
- Billing is not live. Plans are assigned by administrators, and subscription surfaces use the enforced limits in `src/lib/plans.ts`.

## CI and rollback

CI keeps 196 core unit/integration tests, 54 browser checks and 20 generated-diagram views. It uses three dependency installations rather than seven, a Next build cache, two browser groups, cancellation of superseded runs and failure artifacts. Local unit time fell from roughly 36 seconds to 6 seconds; hosted runner times vary.

For application rollback, redeploy the prior application revision. Leave additive migrations 027–028 installed; older clients do not use them. They will also lack v1.2.0's concurrency and preview protections. Do not drop tables containing previews or remove functions while v1.2.0 instances are still running. Repeat the staging checks after rollback.
