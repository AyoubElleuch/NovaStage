/**
 * Domain-Specific Guidance & Architectural Templates
 * Dynamically injected into Phase 2 generation based on Phase 1 decomposition tags.
 */

export interface DomainGuidance {
  domain: string;
  keywords: string[];
  recommendedMilestones: {
    title: string;
    description: string;
    color: "default" | "amber" | "purple" | "rose";
    phase: "planning" | "architecture" | "implementation" | "testing" | "deployment" | "operations";
    checkpoints: string[];
  }[];
  keyArchitecturalConsiderations: string[];
}

export const DOMAIN_TEMPLATES: Record<string, DomainGuidance> = {
  saas: {
    domain: "SaaS & Subscription Platforms",
    keywords: ["saas", "subscription", "stripe", "billing", "tenant", "multitenant", "tier", "plan", "b2b"],
    recommendedMilestones: [
      {
        title: "Multi-Tenant Architecture & Data Isolation",
        description: "Configure tenant scoping, row-level security (RLS), schema migrations, and organization schemas",
        color: "default",
        phase: "architecture",
        checkpoints: [
          "Define organization and workspace tenant models with compound UUID keys",
          "Implement PostgreSQL Row-Level Security (RLS) policies enforcing tenant isolation",
          "Create tenant context resolution middleware from subdomain and JWT claims",
          "Set up automated migration pipelines with tenant schema validation tests",
          "Build tenant lifecycle management service (provisioning, suspension, offboarding)",
          "Configure tenant audit logging with structured JSON metadata in dedicated tables",
        ],
      },
      {
        title: "Authentication, RBAC & Session Security",
        description: "Implement modern authentication, invitation flows, permission matrix, and role guards",
        color: "amber",
        phase: "implementation",
        checkpoints: [
          "Configure OAuth 2.0 & email/password authentication with cryptographic session tokens",
          "Build granular Permission-Based Access Control (PBAC) matrix and server route guards",
          "Develop team member invitation, email verification, and token exchange flows",
          "Implement session revocation, multi-device management, and refresh token rotation",
          "Add rate-limiting and brute-force protection middleware on auth endpoints",
          "Configure MFA/TOTP enrollment and backup recovery codes",
        ],
      },
      {
        title: "Stripe Billing & Subscription Lifecycle Engine",
        description: "Build pricing tier management, checkout sessions, webhook handlers, and meter tracking",
        color: "purple",
        phase: "implementation",
        checkpoints: [
          "Integrate Stripe Checkout and Customer Portal with idempotency keys",
          "Implement secure webhook listener handling invoice.paid, subscription.updated/deleted",
          "Build entitlement enforcement engine checking active subscription tier features",
          "Create metered usage tracking pipeline with batched asynchronous sync to Stripe",
          "Develop billing settings UI showing current plan, invoices, and payment methods",
          "Add automated dunning management and payment failure warning banners",
        ],
      },
      {
        title: "Admin Analytics & Operations Dashboard",
        description: "Develop metrics aggregation, user management, feature flags, and telemetry feeds",
        color: "amber",
        phase: "implementation",
        checkpoints: [
          "Build admin dashboard metrics (MRR, churn rate, DAU/MAU, active seats)",
          "Create super-admin user impersonation mode with strict audit logs",
          "Implement feature flag toggle system with percentage-based tenant rollouts",
          "Build global search and filterable data tables for customer support",
          "Develop system health status monitoring and background job queue inspector",
        ],
      },
    ],
    keyArchitecturalConsiderations: [
      "Ensure tenant ID is always validated server-side from session context, never client body params",
      "Stripe webhooks must verify HMAC signatures and process events idempotently using event ID deduping",
      "Subscriptions require grace period handling when renewals fail before revoking tenant access",
    ],
  },

  ecommerce: {
    domain: "E-Commerce & Digital Marketplaces",
    keywords: ["ecommerce", "e-commerce", "shop", "store", "cart", "checkout", "inventory", "product", "order", "catalog"],
    recommendedMilestones: [
      {
        title: "Product Catalog & Search Engine",
        description: "Build hierarchical catalog schema, variant matrices, image CDN pipelines, and full-text search",
        color: "default",
        phase: "architecture",
        checkpoints: [
          "Design relational schema for products, categories, SKU variants, and attribute sets",
          "Implement full-text search with fuzzy matching, facets, and filter indices",
          "Build multi-resolution image upload pipeline with WebP conversion and CDN caching",
          "Create inventory stock reservation engine with optimistic concurrency locking",
          "Implement category breadcrumb navigation and SEO-optimized dynamic metadata",
          "Build bulk product CSV import/export service with schema validation",
        ],
      },
      {
        title: "Shopping Cart & Checkout Funnel",
        description: "Implement persistent carts, coupon engines, tax calculation, and payment gateway integration",
        color: "purple",
        phase: "implementation",
        checkpoints: [
          "Build guest and authenticated sync cart state engine with Redis persistence",
          "Integrate real-time tax calculation and shipping rate estimation APIs",
          "Implement promo code and coupon validation engine with usage limit constraints",
          "Build multi-step checkout workflow with address autocomplete and phone validation",
          "Integrate Stripe / PayPal payment intents with 3D Secure verification",
          "Implement abandoned cart detection and recovery event triggers",
        ],
      },
      {
        title: "Order Management & Fulfillment Pipeline",
        description: "Develop order state machines, invoice generation, webhook tracking, and notifications",
        color: "rose",
        phase: "implementation",
        checkpoints: [
          "Build robust order state machine (pending, paid, processing, shipped, delivered, refunded)",
          "Implement automatic PDF invoice and receipt generation with email delivery",
          "Integrate carrier tracking webhooks (FedEx, UPS, DHL) with live status updates",
          "Create merchant fulfillment dashboard with batch order status transition tools",
          "Build customer return/refund workflow with automated inventory restocking",
        ],
      },
    ],
    keyArchitecturalConsiderations: [
      "Inventory must be reserved with TTL during checkout to prevent double-selling flash sales",
      "Payment processing and order creation must be transactional to prevent orphaned charges",
    ],
  },

  realtime: {
    domain: "Realtime Collaboration & Multiplayer",
    keywords: ["realtime", "real-time", "collaboration", "multiplayer", "canvas", "chat", "cursor", "websocket", "sync", "presence"],
    recommendedMilestones: [
      {
        title: "WebSocket Connection & Presence Hub",
        description: "Configure distributed WebSocket channels, heartbeat health, and peer presence tracking",
        color: "default",
        phase: "architecture",
        checkpoints: [
          "Configure multiplexed WebSocket connection pooling with automatic backoff reconnection",
          "Implement presence heartbeat broadcast tracking peer online/idle/offline status",
          "Build room-based channel routing with authentication handshake tokens",
          "Create client-side network latency pill displaying live ping and packet loss",
          "Implement client state resynchronization hook triggered upon network recovery",
        ],
      },
      {
        title: "Multiplayer Physics, Cursors & State Interpolation",
        description: "Implement high-frequency cursor transmission, spring-lerp interpolation, and dead reckoning",
        color: "amber",
        phase: "implementation",
        checkpoints: [
          "Build 35Hz throttled cursor transmitter with distance-threshold gating",
          "Implement 60fps requestAnimationFrame exponential spring-lerp interpolation engine",
          "Add velocity dead-reckoning prediction for delayed or jittery network packets",
          "Create peer selection highlighting and active editing indicator badges",
          "Implement automatic cursor fade-out when collaborator becomes inactive (>3s)",
        ],
      },
      {
        title: "Zero-Collision Distributed Locking & Mutation Queue",
        description: "Implement lease-based exclusive edit locks, conflict resolution, and optimistic UI updates",
        color: "purple",
        phase: "implementation",
        checkpoints: [
          "Build atomic conditional claim lock engine with automatic 60s lease renewal",
          "Implement real-time handoff request queue with Grant/Decline toast notifications",
          "Create optimistic client mutation queue with rollback on server rejection",
          "Build broadcast event dispatcher for node updates and checkpoint toggles",
          "Add autonomous 2.5s ticker releasing expired claim locks without server roundtrips",
        ],
      },
    ],
    keyArchitecturalConsiderations: [
      "Throttle cursor coordinate broadcasts to 30-40Hz to prevent saturating bandwidth",
      "Use optimistic client updates paired with server version checks to eliminate lock-step latency",
    ],
  },

  api_backend: {
    domain: "High-Throughput API & Microservices",
    keywords: ["api", "microservice", "backend", "graphql", "rest", "queue", "worker", "redis", "kafka", "grpc", "cache"],
    recommendedMilestones: [
      {
        title: "Data Layer, Partitioning & Connection Pooling",
        description: "Configure PostgreSQL schema, Prisma/Drizzle ORM, read replicas, and connection pooling",
        color: "default",
        phase: "architecture",
        checkpoints: [
          "Design normalized relational schema with foreign key constraints and compound indexes",
          "Configure PgBouncer / Supabase Supavisor connection pooling for high concurrency",
          "Implement database migration rollback strategies and zero-downtime column migrations",
          "Build database seeding scripts for local development and CI testing environments",
          "Set up query performance telemetry with slow query logging and EXPLAIN ANALYZE triggers",
        ],
      },
      {
        title: "API Gateway, Rate Limiting & Middleware Pipeline",
        description: "Implement token bucket rate limiting, CORS policies, request validation, and telemetry",
        color: "purple",
        phase: "implementation",
        checkpoints: [
          "Implement sliding-window rate limiting with Redis per IP and authenticated API key",
          "Build schema validation middleware utilizing Zod/TypeBox for all route payloads",
          "Configure OpenAPI/Swagger automatic documentation generation with typed client SDKs",
          "Implement distributed tracing with OpenTelemetry and correlation request IDs",
          "Build structured JSON logging pipeline with PII scrubbing and error stack redaction",
        ],
      },
      {
        title: "Asynchronous Job Queue & Event Processing",
        description: "Build background worker architecture, dead letter queues, and retry policies",
        color: "rose",
        phase: "implementation",
        checkpoints: [
          "Configure BullMQ / Redis worker queues with configurable concurrency and priorities",
          "Implement exponential backoff retry policies and Dead Letter Queue (DLQ) alerts",
          "Build scheduled cron job runner with distributed locking preventing duplicate runs",
          "Implement asynchronous email and push notification dispatchers",
          "Create worker queue health monitor endpoint with Prometheus metrics exporter",
        ],
      },
    ],
    keyArchitecturalConsiderations: [
      "Always validate request bodies with strict schemas before hitting database or queues",
      "Use distributed locks (Redlock) for non-idempotent scheduled background tasks",
    ],
  },

  mobile_cloud: {
    domain: "Mobile Apps & Cross-Platform Systems",
    keywords: ["mobile", "ios", "android", "react native", "flutter", "expo", "offline", "push notifications"],
    recommendedMilestones: [
      {
        title: "Offline-First State & Local Sync Engine",
        description: "Build local SQLite/WatermelonDB storage, conflict resolution, and background sync",
        color: "default",
        phase: "architecture",
        checkpoints: [
          "Configure local SQLite database with automatic schema migrations on device",
          "Build two-way sync engine with delta changesets and timestamp-based conflict resolution",
          "Implement optimistic local UI mutations that queue requests during offline mode",
          "Create network connectivity listener triggering automatic sync when reconnected",
          "Build background fetch synchronization task respecting device battery state",
        ],
      },
      {
        title: "Push Notifications & Deep Linking Architecture",
        description: "Implement APNs/FCM tokens, notification grouping, and universal universal link routing",
        color: "purple",
        phase: "implementation",
        checkpoints: [
          "Configure APNs (iOS) and FCM (Android) push notification certificates and credentials",
          "Build device push token registration and invalidation service with user mapping",
          "Implement Universal Links and Android App Links routing to nested in-app screens",
          "Create rich interactive notification payloads with actionable buttons",
          "Build notification preference center allowing granular user category toggles",
        ],
      },
    ],
    keyArchitecturalConsiderations: [
      "Assume device will lose internet connection at any point during write operations",
      "Handle token rotation for push notification endpoints gracefully without duplicate delivery",
    ],
  },
};

/**
 * Helper to match relevant domain templates given prompt domain tags
 */
export function getDomainGuidance(domainTags: string[], promptText: string): DomainGuidance[] {
  const lowerPrompt = promptText.toLowerCase();
  const matched: DomainGuidance[] = [];

  for (const [, template] of Object.entries(DOMAIN_TEMPLATES)) {
    const isKeywordMatch = template.keywords.some(
      (kw) => lowerPrompt.includes(kw) || domainTags.some((tag) => tag.toLowerCase().includes(kw))
    );
    if (isKeywordMatch) {
      matched.push(template);
    }
  }

  return matched;
}
