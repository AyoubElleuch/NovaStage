-- Canvas-scoped personal MCP credentials. Only SHA-256 hashes are stored.
create table public.canvas_mcp_connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null default now() + interval '30 days',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Requests originate in the app; drafts originate from the connected assistant.
create table public.canvas_mcp_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (length(prompt) between 1 and 8000),
  mode text not null check (mode in ('workflow', 'aws_architecture')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'applying', 'applied', 'dismissed', 'failed')),
  workflow jsonb,
  validation jsonb,
  created_at timestamptz not null default now()
);
create index canvas_mcp_drafts_owner on public.canvas_mcp_drafts(project_id, user_id, created_at desc);
alter table public.canvas_mcp_connections enable row level security;
alter table public.canvas_mcp_drafts enable row level security;
-- All access goes through authenticated routes or bearer verification; no browser table access.
revoke all on public.canvas_mcp_connections, public.canvas_mcp_drafts from anon, authenticated;
grant all on public.canvas_mcp_connections, public.canvas_mcp_drafts to service_role;

-- All inserts and acceptance happen in one transaction. A failure leaves the draft ready.
create or replace function public.apply_canvas_mcp_draft(p_draft_id uuid, p_user_id uuid, p_graph jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_draft public.canvas_mcp_drafts;
  v_node jsonb;
  v_checkpoint jsonb;
  v_edge jsonb;
  v_shift double precision;
  v_order_base integer;
begin
  select * into v_draft from public.canvas_mcp_drafts where id = p_draft_id and user_id = p_user_id for update;
  if not found or v_draft.status <> 'ready' then raise exception 'Draft is no longer ready'; end if;
  perform 1 from public.projects where id = v_draft.project_id for update;
  if exists (select 1 from public.project_banned_members where project_id = v_draft.project_id and user_id = p_user_id)
    or not (exists (select 1 from public.project_members where project_id = v_draft.project_id and user_id = p_user_id)
      or exists (select 1 from public.projects where id = v_draft.project_id and created_by = p_user_id))
  then raise exception 'Project access denied'; end if;
  -- Respect an active generation by any collaborator, including the caller.
  if exists (select 1 from public.projects where id = v_draft.project_id
    and ai_generating_by is not null and ai_generating_at > now() - interval '120 seconds')
  then raise exception 'Canvas generation is busy'; end if;

  -- Rebase layout under the project lock so concurrent drafts cannot overlap.
  select greatest(0, coalesce(max(position_x + width) + 200, 100) -
    (select min((value->>'position_x')::double precision) from jsonb_array_elements(p_graph->'nodes'))),
    coalesce(max(sort_order) + 1, 0) into v_shift, v_order_base
    from public.canvas_nodes where project_id = v_draft.project_id;

  for v_node in select * from jsonb_array_elements(p_graph->'nodes') loop
    insert into public.canvas_nodes (id, project_id, title, description, node_type, status, color,
      position_x, position_y, width, height, sort_order, aws_metadata, group_metadata)
    values ((v_node->>'id')::uuid, v_draft.project_id, v_node->>'title', v_node->>'description', v_node->>'node_type',
      'draft', v_node->>'color', (v_node->>'position_x')::numeric + v_shift, (v_node->>'position_y')::numeric,
      (v_node->>'width')::numeric, (v_node->>'height')::numeric, (v_node->>'sort_order')::integer + v_order_base,
      nullif(v_node->'aws_metadata', 'null'::jsonb), nullif(v_node->'group_metadata', 'null'::jsonb));
    for v_checkpoint in select * from jsonb_array_elements(v_node->'checkpoints') loop
      insert into public.canvas_checkpoints (id, project_id, node_id, title, is_completed, sort_order)
      values ((v_checkpoint->>'id')::uuid, v_draft.project_id, (v_node->>'id')::uuid,
        v_checkpoint->>'title', false, (v_checkpoint->>'sort_order')::integer);
    end loop;
  end loop;
  -- Parent foreign keys can only be assigned after every group has been inserted.
  for v_node in select * from jsonb_array_elements(p_graph->'nodes') loop
    if v_node->>'parent_group_id' is not null then
      update public.canvas_nodes set parent_group_id = (v_node->>'parent_group_id')::uuid
        where id = (v_node->>'id')::uuid and project_id = v_draft.project_id;
    end if;
  end loop;
  for v_edge in select * from jsonb_array_elements(p_graph->'edges') loop
    insert into public.canvas_edges (id, project_id, source_node_id, target_node_id, source_handle, target_handle, edge_type, label)
    values ((v_edge->>'id')::uuid, v_draft.project_id, (v_edge->>'source_node_id')::uuid,
      (v_edge->>'target_node_id')::uuid, v_edge->>'source_handle', v_edge->>'target_handle', v_edge->>'edge_type', v_edge->>'label');
  end loop;
  update public.canvas_mcp_drafts set status = 'applied' where id = p_draft_id;
end;
$$;
revoke all on function public.apply_canvas_mcp_draft(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_canvas_mcp_draft(uuid, uuid, jsonb) to service_role;
