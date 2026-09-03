-- =============================================================================
-- Migration: Add multi-type node system and AWS infrastructure support
-- =============================================================================
-- Extends canvas_nodes with discriminated node types (milestone, aws_service,
-- group, annotation) and AWS service metadata. Extends canvas_edges with
-- typed connections and labels.
-- =============================================================================

-- 1. Add node type discriminator with backward-compatible default
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS node_type text NOT NULL DEFAULT 'milestone';

-- 2. Add AWS service metadata (JSON) — only populated for aws_service nodes
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS aws_metadata jsonb DEFAULT NULL;

-- 3. Add group container metadata (JSON) — only populated for group nodes
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS group_metadata jsonb DEFAULT NULL;

-- 4. Add annotation metadata (JSON) — only populated for annotation nodes
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS annotation_metadata jsonb DEFAULT NULL;

-- 5. Add parent group reference for containment hierarchy
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS parent_group_id uuid DEFAULT NULL
  REFERENCES canvas_nodes(id) ON DELETE SET NULL;

-- 6. Add edge type discriminator with backward-compatible default
ALTER TABLE canvas_edges ADD COLUMN IF NOT EXISTS edge_type text NOT NULL DEFAULT 'dependency';

-- 7. Add optional edge label (e.g. "port 443", "HTTPS", "gRPC")
ALTER TABLE canvas_edges ADD COLUMN IF NOT EXISTS label text DEFAULT NULL;

-- 8. Composite index for fast node type queries within a project
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_project_type
  ON canvas_nodes(project_id, node_type);

-- 9. Index for efficient parent group lookups
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_parent_group
  ON canvas_nodes(parent_group_id)
  WHERE parent_group_id IS NOT NULL;

-- 10. Validate node_type values with a check constraint
ALTER TABLE canvas_nodes ADD CONSTRAINT chk_canvas_node_type
  CHECK (node_type IN ('milestone', 'aws_service', 'group', 'annotation'));

-- 11. Validate edge_type values with a check constraint
ALTER TABLE canvas_edges ADD CONSTRAINT chk_canvas_edge_type
  CHECK (edge_type IN ('dependency', 'data_flow', 'network', 'event'));
