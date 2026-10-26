-- Keep old draft payloads for history, but retire requests that no longer have a supported mode.
update public.canvas_mcp_drafts
set status = case when status = 'applied' then status else 'dismissed' end, mode = 'workflow'
where mode not in ('workflow', 'aws_architecture');

alter table public.canvas_mcp_drafts drop constraint if exists canvas_mcp_drafts_mode_check;
alter table public.canvas_mcp_drafts add constraint canvas_mcp_drafts_mode_check
  check (mode in ('workflow', 'aws_architecture'));
