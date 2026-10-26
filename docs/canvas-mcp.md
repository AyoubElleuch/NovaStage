# Canvas MCP connections

NovaStage exposes a stateless Streamable HTTP MCP server at `/api/mcp`. Codex and Claude Code generate diagrams with the model and account selected in their own client. NovaStage does not proxy their subscriptions, call Gemini, or consume built-in AI quota for this flow.

## Deploy

1. Apply `supabase/migrations/023_canvas_mcp.sql` after migrations 001–022. This adds private connection and draft tables and an atomic acceptance function.
2. Deploy the application with its existing Supabase service-role configuration. No model API key is needed for MCP. Built-in AI continues using its existing configuration.
3. Open a project → AI assistant → **Your AI · MCP** → **Create canvas connection**. Copy the Codex or Claude Code setup, run it locally, and start/restart that client. The generated commands configure a uniquely named server per canvas.
4. Codex setup requires Node.js/npm and uses `npx --yes @openai/codex` so the standalone `codex` command does not need to be on PATH. The first invocation may download the official package. After setup, use **Copy Codex launch command** and run it in the same terminal, then sign in if prompted. The token environment variable must be available in each subsequent Codex session. For the desktop app, configure the MCP URL and bearer token environment variable in its MCP settings and launch the app with that variable available. Claude Code's command requires Claude Code installed in the terminal and saves the bearer header in user configuration.
5. Queue a prompt in NovaStage and paste the provided assistant prompt into your connected client. Alternatively, ask the client directly to create a workflow, AWS architecture, or full-stack diagram using the NovaStage tools.
6. Review the returned draft in NovaStage and choose **Add to canvas**. New diagrams are appended; existing content is preserved. Dismiss an unwanted draft or pending request from the same panel.

The UI reports when a client has successfully reached the canvas. Creating or copying a credential alone does not establish a connection. MCP does not start a local assistant or invoke its selected model when a prompt is queued; the user must prompt the running client. Browser applications cannot silently install MCP configuration on a user's machine. This release provides copyable native setup commands rather than claiming a one-click installation.

## Tools and contracts

- `get_canvas`: current graph with member identities, claims, and project metadata removed.
- `list_requests`: this user's pending prompts for the scoped canvas.
- `search_aws_services`: canonical AWS catalog IDs and default configuration.
- `propose_workflow`: a strict, bounded diagram schema, optionally answering a pending request by ID. Returns a reviewable draft, never a direct canvas write.

Tool discovery publishes the complete JSON schema. All arrays are required; unused arrays are empty. Supported modes are `workflow`, `aws_architecture`, and `full_stack`. Each milestone has 4–9 domain-specific checkpoints. References use unique temporary IDs across all node types. Existing node IDs, checkpoint IDs, update intents, and deletion lists are rejected. AWS service IDs must resolve in the catalog. Dependency cycles and nesting are repaired with the existing deterministic validator; layout runs locally. Validation and references are checked again at acceptance.

Acceptance uses a PostgreSQL transaction for nodes, checkpoints, groups, parents, edges, and draft status. Failure rolls everything back and leaves the draft ready. Row locks prevent duplicate acceptance. The transaction rechecks project access and active built-in generation and rebases stale layout positions to avoid overlapping simultaneously accepted diagrams. No network/model calls occur inside the transaction.

## Credentials and access

Connections are personal and scoped to one canvas. Tokens contain 256 random bits, expire after 30 days, and are returned only at creation. Only SHA-256 hashes are stored. Browser responses are private/no-store; credentials are never saved in browser storage or URLs. Setup commands contain a secret and should be kept private. Replacing or revoking a connection invalidates its previous token. Membership/bans are checked directly on every MCP request, bypassing the normal membership cache; deleted/banned accounts cannot authenticate. A revoked token does not delete already proposed drafts, which the user can still review or dismiss.

Tables have RLS enabled with no browser table access. Only the service role can execute draft acceptance, after authenticated web-route authorization. The bearer endpoint accepts neither login cookies nor a project ID chosen by the caller. Requests with a foreign browser Origin are rejected. Traffic is rate limited and MCP bodies are bounded to 512 KiB. HTTPS should be used outside local development.

This release targets Codex and Claude Code's bearer-authenticated remote MCP support. It does not implement OAuth or promise compatibility with clients that require OAuth, such as browser-only connector installation flows. An external assistant can read the canvas content shared with it; do not put real credentials into diagram service configuration.

## Verification

`npm test` covers the real MCP SDK HTTP handshake and tools, schema validation and graph layout, credential scope/revocation, and production SQL migrations using embedded PostgreSQL. Database tests exercise rollback, duplicate acceptance, stale layouts, membership revocation, generation conflicts, and browser-role denial. `npm run test:canvas-browser` exercises the connection, queue, review, acceptance, and revocation UI in an isolated browser fixture.

Client setup follows the [Codex MCP documentation](https://developers.openai.com/codex/mcp) and [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp).
