-- Keep existing connections compatible while allowing richer architecture semantics.
ALTER TABLE canvas_edges DROP CONSTRAINT IF EXISTS chk_canvas_edge_type;
ALTER TABLE canvas_edges ADD CONSTRAINT chk_canvas_edge_type
  CHECK (edge_type IN ('dependency', 'data_flow', 'network', 'event',
    'sync_http', 'async_queue', 'storage_mount', 'security_iam'));
