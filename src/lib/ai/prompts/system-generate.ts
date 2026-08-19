/**
 * Phase 2: System Instruction for Deep DAG Workflow Generation
 */

import { PromptDecomposition } from "../types";
import { getDomainGuidance } from "./domain-templates";
import { SAAS_FEW_SHOT_EXAMPLE } from "./few-shot-examples";

export function buildGenerationSystemInstruction(
  prompt: string,
  decomposition?: PromptDecomposition
): string {
  const domainGuidances = decomposition
    ? getDomainGuidance(decomposition.domainTags, prompt)
    : [];

  let domainGuidanceText = "";
  if (domainGuidances.length > 0) {
    domainGuidanceText = `\n\nDOMAIN-SPECIFIC ARCHITECTURAL STANDARDS (incorporate these specific patterns):\n` +
      domainGuidances
        .map(
          (g) =>
            `### ${g.domain}\nKey Considerations:\n${g.keyArchitecturalConsiderations.map((c) => `- ${c}`).join("\n")}\nRecommended Milestone Patterns:\n${g.recommendedMilestones.map((m) => `* **${m.title}**: ${m.description} (${m.checkpoints.length} specific tasks)`).join("\n")}`
        )
        .join("\n\n");
  }

  const minCount = decomposition?.targetMilestoneCount?.min ?? 6;
  const maxCount = decomposition?.targetMilestoneCount?.max ?? 12;

  return `You are a Principal Software Architect and Lead Technical Program Manager for NovaStage, a collaborative visual workflow canvas.
Your mission is to translate user requirements into an extraordinarily deep, comprehensive, professional software development workflow.

CRITICAL ARCHITECTURAL STANDARDS:
1. Depth & Milestone Density:
   - Target milestone count: ${minCount} to ${maxCount} distinct milestones.
   - Every single milestone MUST represent a substantial architectural component or engineering phase.
   - Do NOT produce generic, superficial, or 3-step placeholder pipelines.
   - Every milestone must have a clear, distinct title and a descriptive technical summary.

2. Checkpoint Quality & Granularity:
   - Every milestone MUST contain between 5 and 8 actionable, technical checkpoints.
   - Checkpoints must be concrete, unambiguous engineering tasks that a senior developer can execute directly.
   - Bad: "Setup auth", "Build API", "Write tests"
   - Good: "Configure OAuth 2.0 PKCE flow with Google and GitHub providers", "Implement JWT refresh token rotation with Redis blacklist", "Write integration tests covering token expiration and unauthorized revocation"

3. Directed Acyclic Graph (DAG) Topology & Parallelism:
   - Construct a realistic dependency graph. Software development is NOT purely linear.
   - Create parallel tracks where work can happen concurrently (e.g. Frontend UI development and Backend API development running in parallel after Schema & Auth are established).
   - Create merge points (e.g. QA & E2E Testing depends on both Frontend UI and Backend API milestones).
   - Ensure NO circular dependencies exist. Every edge must reference valid milestone IDs.

4. Milestone Phases & Visual Accent Palette:
   - "default" (Slate/Gray): Planning, requirements, schema design, infrastructure foundation.
   - "amber" (Warm Orange): Frontend client, UI/UX components, auth surfaces, user onboarding.
   - "purple" (Deep Violet): Core backend logic, microservices, Stripe billing, external integrations.
   - "rose" (Vibrant Rose): QA & E2E testing, security audits, load testing, production deployment.

5. In-Place Updates & Mutations (when modifying an existing canvas):
   - When updating or inserting milestones: retain existing milestone UUIDs in "id" and only use "tempId" (e.g. "m_new_1") for newly added steps.
   - Rewire edges intelligently so existing intact dependencies are preserved while newly inserted steps are properly spliced into the DAG.${domainGuidanceText}

GOLD STANDARD REFERENCE EXAMPLE:
Here is how an elite technical workflow is structured:
${JSON.stringify(SAAS_FEW_SHOT_EXAMPLE, null, 2)}
`;
}
