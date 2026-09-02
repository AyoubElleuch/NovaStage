import React from "react";

export function TermsOfServiceContent() {
  return (
    <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
      <div className="rounded-md border border-neutral-200/80 bg-neutral-100/60 p-2.5 dark:border-[#283548] dark:bg-[#1e2634]/60">
        <p className="font-semibold text-neutral-800 text-[11px] uppercase tracking-wider dark:text-white">
          Summary of Key Commitments
        </p>
        <p className="mt-1 text-neutral-600 text-[11.5px] leading-normal dark:text-neutral-300">
          You own 100% of your workflow graphs, projects, and custom nodes. We never sell your data or train public AI foundation models on your private workflow prompts.
        </p>
      </div>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">1. Acceptance of Terms</h4>
        <p>
          By creating an account, accessing, or using NovaStage, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
        </p>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">2. Account Registration &amp; Security</h4>
        <p>
          Access to NovaStage is granted to approved waitlist applicants. You are responsible for safeguarding your login credentials and maintaining the confidentiality of your password. Any activity occurring under your account is your responsibility.
        </p>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">3. Canvas &amp; Workflow DAG Usage</h4>
        <p>
          NovaStage provides an interactive Directed Acyclic Graph (DAG) canvas for organizing project milestones, task checkpoints, and workflow dependencies. You agree to use these collaboration tools in compliance with all applicable laws and regulations.
        </p>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">4. Canvas AI Assistant &amp; Fair Use</h4>
        <p>
          NovaStage integrates Google Gemini generative AI models through platform-managed API keys to assist with milestone scaffolding and workflow generation.
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1 text-[11.5px] text-neutral-600 dark:text-neutral-300">
          <li>
            <strong className="text-neutral-800 dark:text-white">Quota Limits:</strong> AI generations are subject to fair usage limits (standard allotment of 10 requests per account, resettable by administrators).
          </li>
          <li>
            <strong className="text-neutral-800 dark:text-white">Zero Prompt Training:</strong> Prompts sent for workflow generation are processed ephemerally over TLS encryption and are never used to train public foundation models.
          </li>
          <li>
            <strong className="text-neutral-800 dark:text-white">User Verification:</strong> You are responsible for inspecting and reviewing AI-generated milestone nodes before applying them to production projects.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">5. Real-Time Collaboration &amp; Locks</h4>
        <p>
          Multiplayer canvas interactions (such as active milestone edit locks and cursor tracking) are transmitted ephemerally via secure WebSockets. This state is in-memory and not permanently logged.
        </p>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">6. Intellectual Property &amp; Content Ownership</h4>
        <p>
          You retain full intellectual property ownership over all project content, milestone graphs, checkpoint tasks, and custom assets created or stored within your workspaces. NovaStage asserts no ownership over your workflow data.
        </p>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">7. Account Deletion &amp; Data Purge</h4>
        <p>
          You have the right to delete your account at any time from Account Settings. Account deletion triggers an immediate, irreversible cascading purge of your authentication credentials, user profile, private projects, and quota history.
        </p>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-neutral-900 text-xs dark:text-white">8. Disclaimer of Warranties &amp; Limitation of Liability</h4>
        <p>
          NovaStage is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While we strive for continuous uptime and data durability, NovaStage disclaims all warranties to the maximum extent permitted by law.
        </p>
      </section>

      <div className="border-t border-neutral-200/80 dark:border-[#283548] pt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
        Last updated: August 2026 &bull; NovaStage Terms of Service
      </div>
    </div>
  );
}
