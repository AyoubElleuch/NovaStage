import type { AIGenerationMode, AIGenerationOperation } from "./types";
import { resolveGenerationOperation } from "./orchestration";
import type { CanvasNode } from "@/lib/canvas/types";

export interface GenerationPreview {
  mode: AIGenerationMode;
  modeLabel: string;
  /** What this mode builds. */
  builds: string;
  /** What this mode leaves alone, so nobody expects AWS resources from a workflow or the reverse. */
  leavesAlone: string;
  operation: AIGenerationOperation;
  /** Existing items of this mode's kind. */
  existingCount: number;
  headline: string;
  details: string[];
  /** Whether the person can choose between updating and adding something new. */
  canChooseOperation: boolean;
  /** True when the operation was inferred from wording or defaults rather than chosen. */
  inferred: boolean;
}

export const MODE_COPY: Record<AIGenerationMode, { label: string; builds: string; leavesAlone: string; item: string; plural: string }> = {
  workflow: {
    label: "Workflow",
    builds: "Milestones with checkpoints and the dependencies between them.",
    leavesAlone: "AWS services and groups are not added or changed.",
    item: "milestone",
    plural: "milestones",
  },
  aws_architecture: {
    label: "AWS Architecture",
    builds: "AWS services, groups such as VPCs, and the data flow between them.",
    leavesAlone: "Milestones and checkpoints are not added or changed.",
    item: "AWS resource",
    plural: "AWS resources",
  },
};

/** Describes, before anything is sent, what a built-in generation will do to the canvas. */
export function previewGeneration(input: {
  mode: AIGenerationMode;
  prompt: string;
  nodes: Pick<CanvasNode, "node_type">[];
  /** The person's explicit choice, if they made one. */
  chosenOperation?: AIGenerationOperation | null;
}): GenerationPreview {
  const copy = MODE_COPY[input.mode];
  const existingCount = input.nodes.filter((node) => {
    const type = node.node_type || "milestone";
    return input.mode === "workflow" ? type === "milestone" : type === "aws_service" || type === "group";
  }).length;
  const resolved = resolveGenerationOperation(input.mode, input.prompt, input.nodes, input.chosenOperation ?? undefined);
  const noun = existingCount === 1 ? copy.item : copy.plural;
  const diagram = input.mode === "workflow" ? "workflow" : "architecture";

  let headline: string;
  const details: string[] = [];
  if (!existingCount) {
    headline = `Adds a new ${diagram} to your canvas`;
    details.push("Nothing on your canvas is changed.");
  } else if (resolved === "update") {
    headline = `Updates your existing ${diagram}`;
    details.push(`It can rename, reconnect or remove the ${existingCount} existing ${noun} if your request asks for it.`);
    details.push("Completed checkpoints and edit claims are kept. Nearby layout is rearranged; other diagrams stay put.");
  } else {
    headline = `Adds a separate new ${diagram}`;
    details.push(`Your ${existingCount} existing ${noun} ${existingCount === 1 ? "is" : "are"} left as ${existingCount === 1 ? "it is" : "they are"}.`);
  }
  details.push("It's applied right away for everyone on this canvas, and you can undo it afterwards.");

  return {
    mode: input.mode,
    modeLabel: copy.label,
    builds: copy.builds,
    leavesAlone: copy.leavesAlone,
    operation: resolved,
    existingCount,
    headline,
    details,
    canChooseOperation: existingCount > 0,
    inferred: !input.chosenOperation,
  };
}
