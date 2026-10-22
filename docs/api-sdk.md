# NovaStage API

Import [openapi.yaml](../public/openapi.yaml) into the SDK generator. It uses OpenAPI 3.0.3 and covers all 15 HTTP route paths: 19 API operations plus the OAuth callback. The application serves the specification at `/openapi.yaml` after deployment.

Set the SDK base URL to the NovaStage origin, without `/api`. The specification defaults to `http://localhost:3000`. Start testing with `ping`, `getAccountSettings`, `listProjects`, and `createProject`; these require no AI-provider credentials.

## Endpoints

| Method | Path | Operation ID | Access |
| --- | --- | --- | --- |
| GET / HEAD | `/api/ping` | `ping` / `headPing` | Public |
| GET | `/api/dashboard/settings` | `getAccountSettings` | Signed-in user |
| GET / POST | `/api/dashboard/projects` | `listProjects` / `createProject` | Signed-in user |
| GET | `/api/dashboard/projects/members` | `listProjectMembers` | Project member or owner |
| POST | `/api/dashboard/projects/join` | `requestToJoinProject` | Signed-in user; owner approval required |
| POST | `/api/dashboard/projects/leave` | `leaveProject` | Collaborator |
| POST | `/api/dashboard/projects/delete` | `deleteProject` | Owner |
| POST | `/api/dashboard/projects/kick` | `kickProjectMember` | Owner |
| GET / POST | `/api/dashboard/projects/requests` | `listJoinRequests` / `resolveJoinRequest` | Owner |
| GET / POST | `/api/dashboard/projects/banned` | `listBannedMembers` / `unbanProjectMember` | Owner |
| GET / POST | `/api/dashboard/projects/{slug}/canvas` | `getProjectCanvas` / `mutateProjectCanvas` | Project member |
| POST | `/api/dashboard/projects/{slug}/canvas/checkpoints` | `mutateCheckpoint` | Project member; milestone claim required |
| POST | `/api/dashboard/projects/{slug}/canvas/claim` | `manageCanvasClaim` | Project member; some actions require holder or owner |
| POST | `/api/dashboard/projects/{slug}/canvas/ai-generate` | `generateProjectCanvas` | Project member; AI quota and server configuration required |
| GET | `/auth/callback` | `completeAuthCallback` | Browser OAuth/PKCE flow; redirects with 307 |

Request fields, response schemas, action variants, and permission failures are defined in the YAML. Next.js server actions, Supabase Realtime messages, and external provider APIs are outside this HTTP contract.

## Authentication

Protected routes read and verify a Supabase SSR **cookie session**. They do not accept a bearer JWT, a session-token query/body parameter, or a NovaStage API key. Provider credentials remain on the server.

For a server SDK test, sign in to NovaStage and copy the complete `Cookie` header from a dashboard API request in browser DevTools. Store it privately as `NOVASTAGE_COOKIE`, including all Supabase auth-token chunks (`.0`, `.1`, etc.). Configure the SDK's `sessionCookieHeader` security value or custom transport to send that header. Do not commit or share the session value.

The specification models the complete `Cookie` header as an `apiKey` header scheme to accommodate deployment-specific cookie names and chunking. It does not provide a permanent API key. Confirm that your generator supports this scheme or a custom header transport. For ongoing use, retain refreshed `Set-Cookie` values in a cookie jar; a copied header is suitable for a short smoke test.

```js
const baseUrl = process.env.NOVASTAGE_BASE_URL || 'http://localhost:3000';
const cookie = process.env.NOVASTAGE_COOKIE;
if (!cookie) throw new Error('Set NOVASTAGE_COOKIE');

const response = await fetch(`${baseUrl}/api/dashboard/settings`, {
  headers: { Cookie: cookie },
});
if (!response.ok) throw new Error(`Account request failed: ${response.status}`);
```

Browser SDKs on the NovaStage origin should use `credentials: 'include'` and let the browser send cookies. Browser JavaScript cannot set `Cookie` directly, and NovaStage has no custom cross-origin API CORS configuration. A standalone Supabase client using local storage does not establish the SSR cookies these routes require.

## Response behavior

- `/api/ping` returns 204 without a body and checks reachability only.
- Project creation returns 200. Joining requests approval; it does not immediately grant membership.
- Canvas mutations and claims can return 200 with `success: false`; inspect the response body.
- Project `updatedAt`, member `joinedAt`, join-request `createdAt`, and banned-member `bannedAt` are display strings, not ISO timestamps.
- Most POST routes return 500 for malformed JSON; AI generation returns 400. Permission and validation status codes vary by route and are documented as implemented.
- Project listing and canvas reads can return empty data after a caught database error.

Edit the YAML directly when routes change. Specification validation and route coverage checks do not replace authenticated SDK tests against a configured deployment.
