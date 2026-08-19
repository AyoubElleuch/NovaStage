/**
 * AI Canvas Workflow Types & Data Contracts
 * Defines context payloads, intent classifications, and structured graph results.
 */

export type AIWorkflowIntent = "create_pipeline" | "update_pipeline" | "create_parallel";

export interface CanvasContextCheckpoint {
  id: string;
  title: string;
  is_completed?: boolean;
  sort_order?: number;
}

export interface CanvasContextMilestone {
  id: string;
  order: number;
  title: string;
  description?: string;
  color?: string;
  status?: string;
  checkpoints: CanvasContextCheckpoint[];
}

export interface CanvasContextEdge {
  id?: string;
  sourceId: string;
  targetId: string;
}

export interface CanvasAIContext {
  existingMilestones: CanvasContextMilestone[];
  existingEdges: CanvasContextEdge[];
  selectedMilestoneId?: string | null;
}

export interface AIProcessedCheckpoint {
  id?: string; // Existing checkpoint UUID if retaining/modifying, or undefined for new
  title: string;
  isCompleted?: boolean;
}

export interface AIProcessedMilestone {
  /** Existing node ID (UUID) if modifying an existing step, or temporary ID like "m_new_1" if newly created */
  id?: string;
  tempId?: string;
  title: string;
  description?: string;
  color?: "default" | "amber" | "purple" | "rose";
  sortOrder?: number;
  checkpoints: AIProcessedCheckpoint[];
}

export interface AIProcessedEdge {
  /** Source milestone ID (either existing UUID or new tempId) */
  fromId: string;
  /** Target milestone ID (either existing UUID or new tempId) */
  toId: string;
}

export interface AIWorkflowResult {
  intent: AIWorkflowIntent;
  summary: string;
  /** Target list of milestones for the workflow being created or updated */
  milestones: AIProcessedMilestone[];
  /** Target list of dependency edges connecting milestones */
  edges: AIProcessedEdge[];
  /** Optional array of existing milestone IDs explicitly removed */
  deletedMilestoneIds?: string[];
}
