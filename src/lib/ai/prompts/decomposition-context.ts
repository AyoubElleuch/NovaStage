import type { PromptDecomposition } from "../types";

export function formatDecompositionContext(decomposition?: PromptDecomposition): string {
  if (!decomposition) return "";
  return `\n\nPhase 1 Architectural Decomposition:\n${JSON.stringify(
    {
      projectType: decomposition.projectType,
      complexityTier: decomposition.complexityTier,
      domainTags: decomposition.domainTags,
      targetMilestones: decomposition.targetMilestoneCount,
      suggestedParallelTracks: decomposition.suggestedParallelTracks,
      concernAreas: decomposition.concernAreas.map((c) => ({
        name: c.name,
        category: c.category,
        priority: c.priority,
        dependencies: c.dependencies,
      })),
      techStackHints: decomposition.techStackHints,
      riskFactors: decomposition.riskFactors,
    },
    null,
    2,
  )}`;
}
