/**
 * AI Canvas Workflow Types & Data Contracts
 * Defines context payloads, intent classifications, prompt decompositions, and structured graph results.
 * Supports multi-mode generation: workflow, AWS architecture, and full stack.
 */

import type { AWSServiceCategory, EdgeType } from "@/lib/canvas/types";
export type { AWSServiceCategory, EdgeType };

export type AIWorkflowIntent = "create_pipeline" | "update_pipeline" | "create_parallel";

/** Generation mode selector for the AI pipeline */
export type AIGenerationMode = "workflow" | "aws_architecture" | "full_stack";

export type MilestonePhase = "planning" | "architecture" | "implementation" | "testing" | "deployment" | "operations";

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

export interface ConcernArea {
  name: string;
  category: "core" | "auth" | "billing" | "data" | "infrastructure" | "ui_ux" | "security" | "testing" | "operations" | "cloud_infrastructure" | "networking" | "monitoring";
  priority: "critical" | "high" | "medium";
  description: string;
  dependencies: string[];
  suggestedCheckpointCount?: number;
}

export interface PromptDecomposition {
  projectType: string;
  domainTags: string[];
  complexityTier: "standard" | "advanced" | "enterprise";
  concernAreas: ConcernArea[];
  techStackHints: string[];
  riskFactors: string[];
  targetMilestoneCount: { min: number; max: number };
  suggestedParallelTracks: string[][];
  summary: string;
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
  phase?: MilestonePhase;
  parallelGroup?: string;
  sortOrder?: number;
  checkpoints: AIProcessedCheckpoint[];
}

export interface AIProcessedEdge {
  /** Source milestone ID (either existing UUID or new tempId) */
  fromId: string;
  /** Target milestone ID (either existing UUID or new tempId) */
  toId: string;
}

// =========================================================================
// AWS Architecture Generation Types
// =========================================================================

/** AI-generated AWS service node */
export interface AIProcessedServiceNode {
  tempId: string;
  /** AWS service key from the service registry (e.g. "ec2", "rds", "lambda") */
  serviceId: string;
  /** Custom display name for this instance (e.g. "Web Server Fleet", "Primary Database") */
  name?: string;
  description?: string;
  /** AWS region (e.g. "us-east-1") */
  region?: string;
  /** Service-specific configuration key-value pairs */
  config?: Record<string, string>;
  /** Parent group tempId if this service is inside a VPC/subnet */
  parentGroupTempId?: string;
}

/** AI-generated grouping container (VPC, subnet, region, AZ) */
export interface AIProcessedGroup {
  tempId: string;
  label: string;
  style: "vpc" | "subnet" | "region" | "availability_zone" | "custom";
  /** TempIds of services/groups contained within this group */
  childTempIds: string[];
  /** Parent group tempId for nested containment (e.g. subnet inside VPC) */
  parentGroupTempId?: string;
}

/** AI-generated connection between services with protocol/port info */
export interface AIProcessedDataFlowEdge {
  fromId: string;
  toId: string;
  edgeType: EdgeType;
  /** Connection label (e.g. "HTTPS", "port 5432", "gRPC") */
  label?: string;
  /** Protocol specification */
  protocol?: string;
}

// =========================================================================
// Unified AI Workflow Result
// =========================================================================

export interface AIWorkflowResult {
  intent: AIWorkflowIntent;
  /** Generation mode that produced this result */
  mode?: AIGenerationMode;
  summary: string;

  /** Milestone mode output — always present (may be empty array in aws_architecture mode) */
  milestones: AIProcessedMilestone[];
  /** Dependency edges connecting milestones */
  edges: AIProcessedEdge[];

  /** AWS architecture mode output — present in aws_architecture and full_stack modes */
  serviceNodes?: AIProcessedServiceNode[];
  /** VPC/subnet/region groupings */
  groups?: AIProcessedGroup[];
  /** Data flow, network, and event connections between services */
  dataFlowEdges?: AIProcessedDataFlowEdge[];

  /** Optional array of existing milestone IDs explicitly removed */
  deletedMilestoneIds?: string[];
  /** Optional decomposition metadata */
  decomposition?: PromptDecomposition;
}

