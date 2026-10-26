import type { AIWorkflowResult } from "../../ai/types";

function workflow(ids: string[], edges: [string, string][], long = false): AIWorkflowResult {
  return { mode: "workflow", intent: "create_pipeline", summary: "Deterministic delivery fixture",
    milestones: ids.map((tempId, index) => ({ tempId, title: long ? `${tempId}: Coordinate platform delivery and validate all operational readiness requirements` : tempId,
      phase: index === 0 ? "planning" : "implementation",
      checkpoints: Array.from({ length: long ? 9 : 4 }, (_, cp) => ({ title: long ? `Acceptance criterion ${cp + 1}: Verify the independently testable requirement for ${tempId} with realistic inputs and failure modes` : `Verify ${tempId} requirement ${cp + 1}` })),
    })), edges: edges.map(([fromId, toId]) => ({ fromId, toId })), serviceNodes: [], groups: [], dataFlowEdges: [],
  };
}
const large = Array.from({ length: 60 }, (_, index) => `step_${String(index).padStart(2, "0")}`);
export const WORKFLOW_FIXTURES = [
  { name: "Linear workflow", result: workflow(["start", "build", "ship"], [["start", "build"], ["build", "ship"]]) },
  { name: "Parallel workflow with join", result: workflow(["plan", "frontend", "backend", "release"], [["plan", "frontend"], ["plan", "backend"], ["frontend", "release"], ["backend", "release"]]) },
  { name: "Long labels and nine checkpoints", result: workflow(["plan", "implement", "verify"], [["plan", "implement"], ["implement", "verify"]], true) },
  { name: "Disconnected delivery tracks", result: workflow(["a", "b", "c", "d"], [["a", "b"], ["c", "d"]]) },
  { name: "Maximum permitted workflow", result: workflow(large, large.slice(1).map((id, index) => [large[index], id])) },
];
