-- Additive storage for manually authored Google Cloud resources.
alter table public.canvas_nodes
  add column gcp_metadata jsonb default null;

alter table public.canvas_nodes
  drop constraint chk_canvas_node_type;

alter table public.canvas_nodes
  add constraint chk_canvas_node_type check (node_type in ('milestone', 'aws_service', 'gcp_service', 'group', 'annotation'));

alter table public.canvas_nodes
  add constraint chk_canvas_gcp_metadata check ((node_type = 'gcp_service' and gcp_metadata is not null and jsonb_typeof(gcp_metadata) = 'object' and gcp_metadata ? 'serviceId' and jsonb_typeof(gcp_metadata -> 'serviceId') = 'string' and length(gcp_metadata ->> 'serviceId') > 0 and aws_metadata is null) or (node_type <> 'gcp_service' and gcp_metadata is null));
