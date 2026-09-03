import { Check, Sparkles } from "lucide-react";

const releases = [
  {
    version: "v1.5.0",
    date: "September 3, 2026",
    title: "AWS Architecture & Advanced Canvas Power Tools",
    summary:
      "Interactive cloud infrastructure modeling (Alpha), synchronized multi-selection and dragging, container resizing, and 0ms optimistic node placement.",
    changes: [
      "AWS Cloud Modeling (Alpha Preview): Introduced official AWS cloud services across Compute, Storage, Database, Networking, Security, and Management with category badges and configuration tags. (Note: AWS integration is currently in Alpha and intended for testing purposes as topology features continue to evolve).",
      "AI Architecture & Full-Stack Modes: Enhanced the AI pipeline to generate cohesive cloud topologies with VPCs, public/private subnets, and interlocking data flow bridges connecting infrastructure to delivery milestones.",
      "Interactive Container Resizing: Added real-time drag-and-drop corner and edge resizing for VPCs, Subnets, and Custom groups with live dimension tooltips and zoom-compensated tracking.",
      "Roomier Cloud Topology Layout: Expanded subnet and VPC layout spacing with generous padding to cleanly encapsulate contained service cards without border clipping.",
      "Marquee Selection & Synchronized Dragging: Resolved canvas marquee drag selection and enabled synchronized multi-node moving and parallel database updates.",
      "Instant 0ms Node Creation: Added optimistic client-side UUID generation for milestones, AWS services, and groups, eliminating network creation lag.",
    ],
  },
  {
    version: "v1.4.1",
    date: "September 3, 2026",
    title: "Eye-Friendly Dark Mode",
    summary: "Complete workspace-wide dark mode with a balanced slate palette, instant switching, and light mode by default.",
    changes: [
      "Introduced system-wide dark mode with an eye-friendly, high-contrast palette and instant switching across all pages and canvas tools.",
    ],
  },
  {
    version: "v1.4.0",
    date: "September 2, 2026",
    title: "Mobile-Native Workspace & Canvas",
    summary: "Complete mobile responsiveness overhaul with fluid touch gestures, multi-touch pinch-to-zoom, and responsive controls.",
    changes: [
      "Engineered multi-touch gesture engine supporting fluid 1-finger canvas panning and 2-finger pinch-to-zoom.",
      "Added two-tier mobile canvas layout elevating AI Assistant and Project Notebook cleanly above the bottom toolbar.",
      "Introduced mobile quick-action card for milestones with instant lock claim/release, task toggles, and detail inspection.",
      "Optimized responsive navigation drawers, comfortable app bars, and touch targets across all workspaces and dialogs.",
    ],
  },
  {
    version: "v1.3.0",
    date: "September 1, 2026",
    title: "Release Pulse",
    summary: "Turn the live roadmap into a clear signal for what is ready, blocked, and critical.",
    changes: [
      "Added a live, task-weighted release readiness score.",
      "Highlighted the longest unfinished dependency path and highest-impact blockers.",
      "Surfaced milestones that are actionable now with direct navigation back to the canvas.",
      "Improved the canvas toolbar on small screens with stable controls and horizontal scrolling.",
      "Polished mobile navigation, project dialogs, and keyboard accessibility across the dashboard.",
    ],
  },
  {
    version: "v1.2.2",
    date: "August 31, 2026",
    title: "Canvas notebook",
    summary: "Keep planning context close to the roadmap without adding more nodes.",
    changes: [
      "Added a project notebook directly to the canvas dock.",
      "Separated roadmap notes and open questions into focused tabs.",
      "Added automatic private browser saving for each project.",
      "Added the Updates tab with a dated product release history.",
    ],
  },
  {
    version: "v1.2.1",
    date: "August 20, 2026",
    title: "A faster collaborative canvas",
    summary: "Made large roadmaps easier to navigate and edit together.",
    changes: [
      "Added a minimap, multi-selection, audio feedback, and a refreshed canvas experience.",
      "Introduced distributed Redis-backed rate limiting and claim locks.",
      "Improved checkpoint readability and interaction targets.",
    ],
  },
  {
    version: "v1.2.0",
    date: "August 19, 2026",
    title: "AI workflow generation",
    summary: "Turn a prompt into a structured roadmap, then refine it in place.",
    changes: [
      "Launched the AI workflow assistant with usage controls.",
      "Added in-place roadmap updates and step insertion.",
      "Upgraded generation to a modular three-phase DAG pipeline.",
    ],
  },
  {
    version: "v1.1.0",
    date: "August 19, 2026",
    title: "Project collaboration",
    summary: "Added the controls teams need to share a live project safely.",
    changes: [
      "Added join approvals, a five-member project limit, and live member eviction.",
      "Improved edge linking, realtime synchronization, and network health feedback.",
      "Added onboarding and password recovery flows.",
    ],
  },
  {
    version: "v1.0.0",
    date: "August 18, 2026",
    title: "NovaStage workspace launch",
    summary: "The first complete workspace for planning and shipping project roadmaps.",
    changes: [
      "Launched projects, invite codes, and collaborator management.",
      "Added the realtime canvas with claim locking and multiplayer presence.",
      "Introduced account settings, the admin console, RBAC, and automated tests.",
    ],
  },
] as const;

export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="dash-enter border-b border-neutral-200 dark:border-[#283548] pb-8">
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Release notes</p>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">Updates</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
          The meaningful changes shaping NovaStage, from the first workspace release to today.
        </p>
      </header>

      <div className="relative py-3 before:absolute before:bottom-8 before:left-1.75 before:top-8 before:w-px before:bg-neutral-200 dark:before:bg-[#283548]">
        {releases.map((release, index) => (
          <article
            key={release.version}
            className="dash-enter relative grid grid-cols-[16px_1fr] gap-5 py-7"
            style={{ "--dash-delay": `${70 + index * 55}ms` } as React.CSSProperties}
          >
            <span
              className={`relative z-10 mt-1 h-3.75 w-3.75 rounded-full border-4 border-white dark:border-[#0f141c] ${
                index === 0 ? "bg-neutral-900 dark:bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"
              }`}
              aria-hidden="true"
            />
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">
                  {release.version}
                </span>
                <time className="text-xs text-neutral-400 dark:text-neutral-500">{release.date}</time>
                {index === 0 && (
                  <span className="rounded-full bg-neutral-900 dark:bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Latest
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-neutral-900 dark:text-white">{release.title}</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{release.summary}</p>
              <ul className="mt-4 space-y-2">
                {release.changes.map((change) => (
                  <li key={change} className="flex gap-2.5 text-[13px] leading-5 text-neutral-600 dark:text-neutral-300">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}