-- Enforce the queued diagram mode at the atomic canvas write boundary.
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

  -- The saved request mode governs the final write, regardless of model output.
  if p_graph->>'mode' is distinct from v_draft.mode
    or (v_draft.workflow is not null and v_draft.workflow->>'mode' is distinct from v_draft.mode)
  then raise exception 'Diagram mode does not match the selected request mode'; end if;
  if jsonb_typeof(p_graph->'nodes') is distinct from 'array'
    or jsonb_typeof(p_graph->'edges') is distinct from 'array'
  then raise exception 'Diagram requires node and edge arrays'; end if;
  if jsonb_array_length(p_graph->'nodes') = 0 then raise exception 'Diagram requires nodes'; end if;
  if v_draft.mode = 'aws_architecture' then
    if not exists (select 1 from jsonb_array_elements(p_graph->'nodes') n where n->>'node_type' = 'aws_service')
      or exists (select 1 from jsonb_array_elements(p_graph->'nodes') n
        where coalesce(n->>'node_type', '') not in ('aws_service', 'group')
          or coalesce(n->'checkpoints', '[]'::jsonb) <> '[]'::jsonb)
    then raise exception 'AWS Architecture accepts AWS services and groups only, without tasks'; end if;
  elsif v_draft.mode = 'workflow' then
    if exists (select 1 from jsonb_array_elements(p_graph->'nodes') n
        where n->>'node_type' is distinct from 'milestone'
          or n->>'parent_group_id' is not null
          or nullif(n->'aws_metadata', 'null'::jsonb) is not null
          or nullif(n->'group_metadata', 'null'::jsonb) is not null)
      or exists (select 1 from jsonb_array_elements(p_graph->'edges') e where e->>'edge_type' is distinct from 'dependency')
    then raise exception 'Workflow accepts task milestones and dependency edges only'; end if;
  else raise exception 'Unsupported generation mode'; end if;
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

