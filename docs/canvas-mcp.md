# Canvas MCP connections

NovaStage exposes a stateless Streamable HTTP MCP server at `/api/mcp`. Codex and Claude Code generate diagrams with the model and account selected in their own client. NovaStage does not proxy their subscriptions, call Gemini, or consume built-in AI quota for this flow.

## Desktop buttons (recommended)

The assistant opens on **Built-in AI** by default. Both tabs use the shared custom picker and support only **Workflow** or **AWS Architecture**. External app buttons stay inactive for empty or whitespace-only input, with no hover changes. Entering a prompt enables them with readable light and dark hover/pressed states.

Open a project → AI assistant → **Your AI**. Describe a diagram and choose **Open Codex** or **Open Claude**. NovaStage queues the request and opens the installed desktop app with a prepared message. The user reviews the message and presses Send. Their assistant uses its HTTP/shell tools to call the MCP endpoint directly, retrieves the canvas and schema, generates the diagram, and proposes a draft. Return to NovaStage to review and add it. An **Open again** link and **Copy prepared request** button are available if the operating system does not open the app.

This flow needs no CLI installation, global PATH entry, environment variable, or persistent MCP configuration. It uses documented `codex://new?prompt=...` and `claude://code/new?q=...` composer links. These links prefill a message; they do not send it or silently install an MCP server. The desktop app must be installed and have HTTP/shell tools; it may ask for network or workspace permission. A browser-only assistant without those tools cannot complete this handoff. There is no provider API call or subscription proxy.

The prepared message contains a signed 15-minute credential for the single queued request. Its HMAC uses the existing server credential with a purpose-specific prefix; the server credential itself is never returned. The signature and expiry are verified before database access. User/project scope is loaded from the pending draft, then membership, bans, and account existence are checked on each call. `list_requests` returns only that request and `propose_workflow` must answer its exact ID. Answering or dismissing the request invalidates the credential immediately. Desktop access uses the draft tables from migration 023; migration 024 retires unsupported generation modes. Pending requests can be dismissed from the canvas if an app fails to open or access expires.

Temporary access travels in the encoded app composer URL and prepared message, so treat that message as private while it is valid. It is kept only in component memory, never in browser storage or MCP configuration, and never grants overwrite/delete access. Creating a desktop handoff does not rotate a user's persistent connection.

## Deployment and advanced persistent connections

1. Apply `supabase/migrations/023_canvas_mcp.sql` after migrations 001–022, followed by `024_retire_combined_generation.sql` and `025_enforce_mcp_diagram_modes.sql`. Migration 023 adds private connection and draft tables and an atomic acceptance function. Migration 024 dismisses unsupported pending drafts, preserves their saved payloads and existing canvas content, and restricts future draft modes to Workflow or AWS Architecture. Migration 025 also enforces the request mode inside the atomic database write: AWS diagrams cannot insert task nodes or checkpoints, and workflows cannot insert AWS services or groups.
2. Deploy the application with its existing Supabase service-role configuration. No model API key is needed for MCP. Built-in AI continues using its existing configuration.
3. For persistent connections, open a project → AI assistant → **Your AI** → **Advanced: persistent MCP connection** → **Create canvas connection**. Copy the Codex or Claude Code setup, run it locally, and start/restart that client. The generated commands configure a uniquely named server per canvas.
4. Codex setup requires Node.js/npm and uses `npx --yes @openai/codex` so the standalone `codex` command does not need to be on PATH. The first invocation may download the official package. After setup, use **Copy Codex launch command** and run it in the same terminal, then sign in if prompted. The token environment variable must be available in each subsequent Codex session. For the desktop app, configure the MCP URL and bearer token environment variable in its MCP settings and launch the app with that variable available. Claude Code's command requires Claude Code installed in the terminal and saves the bearer header in user configuration.
5. Queue a prompt in NovaStage and paste the provided assistant prompt into your connected client. Alternatively, ask the client directly to create a workflow or AWS architecture diagram using the NovaStage tools.
6. Review the returned draft in NovaStage and choose **Add to canvas**. New diagrams are appended; existing content is preserved. Dismiss an unwanted draft or pending request from the same panel.

The advanced UI reports when a persistent client has successfully reached the canvas. Creating or copying a credential alone does not establish a connection. MCP does not invoke a selected model when a prompt is queued; the user sends the prepared message in the assistant. Persistent configuration is optional for the desktop-button flow.

## Tools and contracts

- `get_canvas`: current graph with member identities, claims, and project metadata removed.
- `list_requests`: this user's pending prompts for the scoped canvas.
- `search_aws_services`: canonical AWS catalog IDs and default configuration.
- `propose_workflow`: a strict, bounded diagram schema, optionally answering a pending request by ID. Returns a reviewable draft, never a direct canvas write.

Tool discovery publishes the complete JSON schema. All arrays are required; unused arrays are empty. Supported modes are `workflow` and `aws_architecture`. Each milestone has 4–9 domain-specific checkpoints. References use unique temporary IDs across all node types. Existing node IDs, checkpoint IDs, update intents, and deletion lists are rejected. AWS service IDs must resolve in the catalog. Workflow cycles and conflicting or cyclic nesting are rejected with actionable diagnostics. Valid AWS feedback loops are retained; layout runs locally with stable semantic IDs. Validation, geometry and references are checked before a ready proposal is saved and again at acceptance. Draft review includes a production-card diagram preview and the selected mode.

The tool schema has distinct branches for the two modes. AWS Architecture requires `milestones=[]` and `edges=[]`; Workflow requires `serviceNodes=[]`, `groups=[]`, and `dataFlowEdges=[]`. The saved request mode overrides any interpretation of the natural-language prompt and is checked on proposal and acceptance. Desktop messages explicitly state the selected mode and prohibit copying existing canvas nodes into the new diagram. A mismatched older draft is rejected without writes and must be dismissed and regenerated. Existing task nodes already on the canvas remain visible when a new AWS diagram is appended; this does not add new task nodes.

Acceptance uses a PostgreSQL transaction for nodes, checkpoints, groups, parents, edges, and draft status. Failure rolls everything back and leaves the draft ready. Row locks prevent duplicate acceptance. The transaction rechecks project access and active built-in generation and rebases stale layout positions to avoid overlapping simultaneously accepted diagrams. No network/model calls occur inside the transaction.

## Credentials and access

Persistent connections are personal and scoped to one canvas. Tokens contain 256 random bits, expire after 30 days, and are returned only at creation. Only SHA-256 hashes are stored. Browser responses are private/no-store; persistent credentials are never saved in browser storage or URLs. Setup commands contain a secret and should be kept private. Replacing or revoking a persistent connection invalidates its previous token. Membership/bans are checked directly on every MCP request, bypassing the normal membership cache; deleted/banned accounts cannot authenticate. A revoked persistent token does not delete already proposed drafts, which the user can still review or dismiss. Temporary desktop access is described above and ends when its request is dismissed.

Tables have RLS enabled with no browser table access. Only the service role can execute draft acceptance, after authenticated web-route authorization. The bearer endpoint accepts neither login cookies nor a project ID chosen by the caller. Requests with a foreign browser Origin are rejected. Traffic is rate limited and MCP bodies are bounded to 512 KiB. HTTPS should be used outside local development.

This release targets Codex and Claude Code's bearer-authenticated remote MCP support. It does not implement OAuth or promise compatibility with clients that require OAuth, such as browser-only connector installation flows. An external assistant can read the canvas content shared with it; do not put real credentials into diagram service configuration.

## Verification

`npm test` covers the real MCP SDK HTTP handshake and tools, direct HTTP desktop calls, signed handoff expiry/tampering/request isolation, schema validation and graph layout, persistent credential scope/revocation, and production SQL migrations using embedded PostgreSQL. Database tests exercise rollback, duplicate acceptance, stale layouts, membership revocation, generation conflicts, and browser-role denial. `npm run test:canvas-browser` exercises both desktop launch URLs, fallback copying, request queuing, review/acceptance, and advanced persistent configuration in an isolated browser fixture. Protocol launches are intercepted during the fixture so tests do not create real chats or send messages.

Client setup follows the [Codex MCP documentation](https://developers.openai.com/codex/mcp) and [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp).

Composer links follow [OpenAI's desktop command reference](https://learn.chatgpt.com/docs/app/commands) and [Anthropic's desktop link reference](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link).
