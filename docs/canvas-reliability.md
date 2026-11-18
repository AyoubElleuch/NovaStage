# Canvas editing and collaboration reliability

How the canvas saves, syncs, recovers and undoes, and what the isolated tests do and do not prove.

## Save status

A status sits beside the milestone count in the project header (desktop and phone):

| State                | Meaning                                                                             | Recovery offered              |
| -------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| **Saved**            | Every change made in this tab has been accepted by the server.                      | –                             |
| **Saving…**          | At least one save is in flight. Leaving the page asks for confirmation.             | –                             |
| **Change not saved** | A save was rejected. The canvas was reloaded and shows the stored version.          | Dismiss                       |
| **Not saved**        | A save failed and the reload also failed, so the screen may differ from the server. | Reload                        |
| **Offline**          | The browser is offline. Nothing can be saved until it reconnects.                   | Reload (if edits may be lost) |

Routine "Saving/Saved" changes are not announced to screen readers; problems are. Every failure also raises a toast that says why in plain language (claim lost, connection problem, item deleted by someone else).

There is no automatic offline replay. Failed edits are retained as a local recovery draft before reconnect reloads the shared canvas. The recovery panel offers Restore, Download and Dismiss. Restore requires an unchanged starting canvas; otherwise download for manual reconciliation. Drafts expire after seven days and are scoped to user/project, with a 4 MB limit. If browser storage is unavailable the draft remains in memory and the UI asks you to download before leaving.

## Undo and redo

- History stores _your own change_ as a small delta, not a whole-canvas snapshot. Undoing one edit never overwrites what a collaborator changed elsewhere.
- Undo and redo are **saved**: the inverse change is sent to the server, collaborators are told to reload, and a refresh shows the result. If the save fails, the history position is restored and the screen shows the stored version.
- Covered: creating, deleting, renaming, moving, resizing and editing cards; checkpoints (add, delete, toggle, edit); connections (create, delete, label/type).
- History is limited to 50 steps and persists on this device across refreshes while the saved canvas still matches. A conflicting edit is not automatically undone.
- Re-created items get new server IDs (connections, checkpoints). History matches them by what they connect or say, not by ID. Completed checkpoints on a re-created card are re-toggled after creation.
- Undoing a deletion needs edit access to the restored card; cards nobody holds (for example AI-generated ones) are claimed first. Undoing an AI generation removes the cards it added, which requires being the project owner or holding them.

## Conflicts

- **Claims** are the conflict mechanism. Content edits, checkpoint changes and deletions require a live claim (five-minute lease, renewed every minute while the card is held). A rejected edit reverts on screen with the reason.
- Positions and sizes remain movable without a claim, but saves compare node versions. Multi-card moves use one transaction; one stale or invalid node rolls back the whole batch. Content updates also compare versions.
- Peers only hear about a claim after the server grants it. A lost race shows "Claim Failed" and the real holder.
- A granted handoff locks the previous editor's open card immediately.
- Claim handoff requests are delivered live over Realtime. A holder who was offline when the request was made does not see it later; the requester can ask again.

## Realtime

Edits are broadcast optimistically and confirmed by the server. If a save is rejected, the editor reloads the stored version and tells collaborators to do the same. A refresh response is ignored if another local save started while it was being fetched. After the Realtime channel reconnects the client preserves any failed draft and reloads the canvas, because missed broadcasts are not replayed. The connection indicator also reflects server errors, not only browser connectivity.

## Fixes made while building this

- Heartbeats were never renewing the local lease and could be starved by edits, so a held card could silently drop after five minutes; they now run on a stable timer and update the lease for everyone.
- A 403 for any reason (for example "not authorized to resolve this request") was treated as removal from the project and ended the session; only the membership check does that now.
- Failed checkpoint, claim, release, unlock and request actions were silent or left false state on screen.
- Edges created optimistically kept a temporary ID on collaborators' screens; they now follow the stored ID.
- AI generation could record empty history snapshots because it read state from inside state updaters.
- Server: checkpoint changes are authorized against the checkpoint's own card; connections can only join cards of the same project and can only be deleted within the project; a failed card insert no longer reports success; a heartbeat for a lost claim now says so.
- The membership poll uses `canvas?access=1`, returning 204 without reading the graph, every ten seconds in visible tabs and on focus.

## What the isolated tests prove

`npm run test:reliability-browser` drives the real client in two browser pages against `scripts/canvas-smoke/api-model.mjs`, an in-memory model of the canvas routes (claims, ownership, status codes, failure injection, a controllable clock). Realtime is a BroadcastChannel stand-in. This proves the client's behavior against the _documented contract_: persistence after refresh, undo/redo persistence, collaborator propagation, rejected saves, claim conflicts, offline and reconnection, and renewal past the lease. Route and data-layer rules are separately covered by Vitest tests that run the real route code against an in-memory query builder.

It does **not** prove live Supabase, Realtime delivery, Redis, row-level security, latency or load behavior. Those need a staging check (see the operational checks in `docs/operations.md`).
