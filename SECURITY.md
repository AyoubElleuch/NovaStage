# Security Policy

NovaStage is dedicated to maintaining the highest security and data integrity standards across our real-time collaborative platform. This policy outlines how vulnerabilities should be disclosed, our triage and remediation process, and our commitment to ethical security researchers.

---

## 1. Supported Versions

Security updates and critical vulnerability patches are actively prioritized for the following versions:

| Version | Supported | Status |
| :--- | :---: | :--- |
| **`1.1.x`** | :white_check_mark: | Current active release (Security fixes & maintenance) |
| **`1.0.x`** | :warning: | Maintenance phase (Upgrade to `1.1.x` recommended) |
| **`< 1.0.0`** (Alpha / Beta) | :x: | End of life & unsupported |

---

## 2. Security Architecture & Threat Surface

NovaStage's architecture spans multiple tiers, and security considerations are partitioned accordingly:

- **Database Layer & Authorization**: Non-recursive PostgreSQL Row-Level Security (RLS) policies and `SECURITY DEFINER` PLpgSQL procedures (`public.is_project_member()`, `claim_canvas_node()`, `consume_user_ai_quota()`).
- **Distributed Concurrency & Locks**: Upstash Redis lease locks (`canvas:lock:<projectId>:<nodeId>`) with TTL heartbeats and graceful fallback to Postgres row locks (`SELECT ... FOR UPDATE`).
- **Application & Edge Runtime**: Next.js 16 App Router with SSR session cookies, cryptographic JWT verification via Supabase Auth (`supabase.auth.getUser()`), and distributed sliding-window rate limiters.
- **AI Pipeline Boundaries**: 3-stage generative DAG pipeline with strict schema validation (`executeAIPipeline`, cycle detection via DFS, orphan stitching, and quota bounds) interacting with Google Gemini and OpenAI endpoints.

---

## 3. Reporting a Vulnerability

> [!IMPORTANT]
> **Please do NOT report security vulnerabilities via public GitHub issues, discussions, or social media.** Public disclosure exposes live deployments to unnecessary risk before a fix can be prepared.

### Preferred Method: GitHub Private Vulnerability Reporting
1. Navigate to the NovaStage repository on GitHub: [`AyoubElleuch/NovaStage`](https://github.com/AyoubElleuch/NovaStage).
2. Go to the **Security** tab.
3. Click **Report a vulnerability** under the Advisories sidebar to open a private advisory draft.

### Alternative Method: Direct Security Contact
If you cannot use GitHub Advisories, please send an encrypted or direct email to:
- **Security Contact**: `security@novastage.dev` or via Mohamed Ayoub Eleuch's GitHub profile contact ([@AyoubElleuch](https://github.com/AyoubElleuch)).

### Information to Include in Your Report
To accelerate validation and patching, please provide:
- **Summary**: Description of the vulnerability and its potential impact.
- **Affected Component**: Specify the impacted route handler, PLpgSQL function, Redis lock key, RLS policy, or client component.
- **Proof of Concept (PoC)**: Step-by-step reproduction instructions or a minimal test script demonstrating the issue.
- **Attack Scenario**: Preconditions required for exploitation (e.g., authenticated member vs. public unauthenticated caller).
- **Remediation Suggestions**: (Optional) Recommended code diff or architectural fix if known.

---

## 4. Response & Remediation SLAs

When a vulnerability report is submitted in accordance with this policy, the maintainers commit to:

| Milestone | Target SLA |
| :--- | :--- |
| **Initial Acknowledgment** | Within **48 hours** |
| **Severity Assessment & Triage** | Within **3 to 5 business days** |
| **Fix Development & Testing** | Within **7 to 14 business days** (depending on severity) |
| **Coordinated Disclosure** | Public release and advisory published alongside the patch release |

We will keep you informed of our progress throughout the triage and remediation lifecycle.

---

## 5. Scope & Safe Harbor

### In Scope
- Row-Level Security (RLS) bypasses leading to cross-tenant or unauthorized data access.
- Authentication bypass or privilege escalation (e.g., escalating from `viewer` to `admin` / `super_admin`).
- Server-Side Request Forgery (SSRF) or injection in AI prompt orchestration pipelines.
- Distributed lock bypass or race conditions leading to corrupted canvas state.
- Remote Code Execution (RCE) or sensitive credential leaks (Supabase Service Role Key, Gemini API keys, Redis tokens).

### Out of Scope
- Denial of Service (DoS / DDoS) attacks exhausting server or edge bandwidth.
- Social engineering, phishing, or physical attacks against maintainers or contributors.
- Rate-limiting bypass on non-sensitive, public static assets.
- Issues in upstream dependencies or third-party cloud infrastructure (e.g., AWS, Supabase, Google AI Studio, Upstash) unless caused by NovaStage's direct configuration or integration.

### Safe Harbor Commitment
If you conduct security research in good faith, follow this responsible disclosure policy, avoid accessing or altering other users' private data, and do not disrupt system availability, we consider your research **authorized**. We will not pursue legal action against you or request law enforcement investigation.
