-- Built-in creation/updates commit one validated graph, rather than sequential writes.
-- No existing diagrams are migrated or laid out by this migration.
alter table public.canvas_edges drop constraint if exists unique_edge_connection;
create unique index if not exists unique_typed_canvas_connection on public.canvas_edges
  (source_node_id,target_node_id,source_handle,target_handle,edge_type,label) nulls not distinct;
create or replace function public.apply_canvas_ai_graph(p_project_id uuid, p_user_id uuid, p_mode text, p_graph jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  n jsonb; cp jsonb; e jsonb; saved public.canvas_nodes;
  affected uuid[]; removed uuid[]; shift_x double precision := 0; order_base integer := 0;
begin
  perform 1 from public.projects where id = p_project_id for update;
  if not found or exists (select 1 from public.project_banned_members where project_id=p_project_id and user_id=p_user_id)
    or not (exists (select 1 from public.projects where id=p_project_id and created_by=p_user_id)
      or exists (select 1 from public.project_members where project_id=p_project_id and user_id=p_user_id))
  then raise exception 'Project access denied'; end if;
  if not exists (select 1 from public.projects where id=p_project_id and ai_generating_by=p_user_id
    and ai_generating_at > now() - interval '120 seconds') then raise exception 'Generation lock expired'; end if;
  if p_mode not in ('workflow','aws_architecture') or p_graph->>'mode' is distinct from p_mode
    or jsonb_typeof(p_graph->'nodes') is distinct from 'array' or jsonb_typeof(p_graph->'edges') is distinct from 'array'
    or jsonb_array_length(p_graph->'nodes') not between 1 and 140
    or jsonb_array_length(p_graph->'edges') > 300 then raise exception 'Invalid graph or selected mode'; end if;
  if p_mode='workflow' and (exists (select 1 from jsonb_array_elements(p_graph->'nodes') v where v->>'node_type' is distinct from 'milestone'
      or v->>'parent_group_id' is not null or nullif(v->'aws_metadata','null'::jsonb) is not null or nullif(v->'group_metadata','null'::jsonb) is not null)
    or exists (select 1 from jsonb_array_elements(p_graph->'edges') v where v->>'edge_type' is distinct from 'dependency'))
    then raise exception 'Workflow accepts milestones and dependencies only'; end if;
  if p_mode='aws_architecture' and (not exists (select 1 from jsonb_array_elements(p_graph->'nodes') v where v->>'node_type'='aws_service')
    or exists (select 1 from jsonb_array_elements(p_graph->'nodes') v where coalesce(v->>'node_type','') not in ('aws_service','group') or coalesce(v->'checkpoints','[]'::jsonb)<>'[]'::jsonb)
    or exists (select 1 from jsonb_array_elements(p_graph->'edges') v where v->>'edge_type'='dependency'))
    then raise exception 'AWS Architecture accepts services and groups without tasks'; end if;
  select array_agg((v->>'id')::uuid) into affected from jsonb_array_elements(p_graph->'nodes') v;
  select coalesce(array_agg(v::uuid), '{}'::uuid[]) into removed from jsonb_array_elements_text(coalesce(p_graph->'deletedIds','[]')) v;
  if exists (select 1 from public.canvas_nodes where id=any(affected || removed) and project_id<>p_project_id)
    then raise exception 'Foreign canvas resource'; end if;
  if exists (select 1 from public.canvas_nodes where id=any(affected || removed) and
    ((p_mode='workflow' and node_type<>'milestone') or (p_mode='aws_architecture' and node_type not in ('aws_service','group'))))
    then raise exception 'Cannot modify another generation mode'; end if;
  if exists (select 1 from public.canvas_nodes where id=any(affected || removed) and claimed_by is not null and claimed_by<>p_user_id
    and (claim_expires_at is null or claim_expires_at>now())) then raise exception 'Resource is claimed by a collaborator'; end if;
  if coalesce((p_graph->>'update')::boolean,false)=false then
    if cardinality(removed)>0 or exists (select 1 from public.canvas_nodes where id=any(affected)) then raise exception 'Creation must append new resources'; end if;
    select greatest(0,coalesce(max(position_x+width)+200,100) -
      (select min((v->>'position_x')::double precision) from jsonb_array_elements(p_graph->'nodes') v)),
      coalesce(max(sort_order)+1,0) into shift_x,order_base from public.canvas_nodes where project_id=p_project_id;
  end if;
  -- All validation and mutation occur in this transaction; any failure rolls back.
  delete from public.canvas_nodes where project_id=p_project_id and id=any(removed);
  delete from public.canvas_edges where project_id=p_project_id and source_node_id=any(affected) and target_node_id=any(affected);
  for n in select * from jsonb_array_elements(p_graph->'nodes') loop
    if n->>'width' is null or n->>'height' is null or n->>'position_x' is null or n->>'position_y' is null
      or (n->>'width')::double precision <= 0 or (n->>'height')::double precision <= 0
      or (n->>'position_x')::double precision::text in ('NaN','Infinity','-Infinity')
      or (n->>'position_y')::double precision::text in ('NaN','Infinity','-Infinity')
      or (n->>'width')::double precision::text in ('NaN','Infinity','-Infinity')
      or (n->>'height')::double precision::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid geometry'; end if;
    if exists (select 1 from public.canvas_nodes old where old.project_id=p_project_id and not old.id=any(affected)
      and old.position_x < (n->>'position_x')::double precision+shift_x+(n->>'width')::double precision+24
      and old.position_x+old.width+24 > (n->>'position_x')::double precision+shift_x
      and old.position_y < (n->>'position_y')::double precision+(n->>'height')::double precision+24
      and old.position_y+old.height+24 > (n->>'position_y')::double precision) then raise exception 'Canvas moved into generated layout; retry'; end if;
    select * into saved from public.canvas_nodes where id=(n->>'id')::uuid for update;
    if found and (saved.version is distinct from (n->>'version')::integer or saved.node_type<>(n->>'node_type')) then raise exception 'Stale or incompatible canvas resource'; end if;
    insert into public.canvas_nodes (id,project_id,title,description,node_type,status,color,position_x,position_y,width,height,sort_order,aws_metadata,group_metadata)
      values ((n->>'id')::uuid,p_project_id,n->>'title',n->>'description',n->>'node_type','draft',n->>'color',
        (n->>'position_x')::double precision+shift_x,(n->>'position_y')::double precision,(n->>'width')::double precision,(n->>'height')::double precision,
        (n->>'sort_order')::integer+order_base,nullif(n->'aws_metadata','null'::jsonb),nullif(n->'group_metadata','null'::jsonb))
      on conflict (id) do update set title=excluded.title,description=excluded.description,color=excluded.color,
        position_x=excluded.position_x,position_y=excluded.position_y,width=excluded.width,height=excluded.height,sort_order=excluded.sort_order,
        aws_metadata=excluded.aws_metadata,group_metadata=excluded.group_metadata,version=canvas_nodes.version+1,updated_at=now();
    for cp in select * from jsonb_array_elements(n->'checkpoints') loop
      if exists (select 1 from public.canvas_checkpoints where id=(cp->>'id')::uuid and (project_id<>p_project_id or node_id<>(n->>'id')::uuid)) then raise exception 'Foreign checkpoint'; end if;
      insert into public.canvas_checkpoints(id,project_id,node_id,title,is_completed,sort_order)
        values ((cp->>'id')::uuid,p_project_id,(n->>'id')::uuid,cp->>'title',coalesce((cp->>'is_completed')::boolean,false),(cp->>'sort_order')::integer)
        on conflict (id) do update set title=excluded.title,sort_order=excluded.sort_order,
          is_completed=canvas_checkpoints.is_completed or excluded.is_completed,updated_at=now();
    end loop;
    -- Retain completed checkpoints even when a provider omits them.
    delete from public.canvas_checkpoints where node_id=(n->>'id')::uuid and not is_completed
      and id not in (select (v->>'id')::uuid from jsonb_array_elements(n->'checkpoints') v);
  end loop;
  for n in select * from jsonb_array_elements(p_graph->'nodes') loop
    if n->>'parent_group_id' is not null and not (n->>'parent_group_id')::uuid=any(affected) then raise exception 'Foreign parent'; end if;
    update public.canvas_nodes set parent_group_id=(n->>'parent_group_id')::uuid where id=(n->>'id')::uuid;
  end loop;
  for e in select * from jsonb_array_elements(p_graph->'edges') loop
    if not ((e->>'source_node_id')::uuid=any(affected) and (e->>'target_node_id')::uuid=any(affected)) then raise exception 'Foreign endpoint'; end if;
    insert into public.canvas_edges(id,project_id,source_node_id,target_node_id,source_handle,target_handle,edge_type,label)
      values ((e->>'id')::uuid,p_project_id,(e->>'source_node_id')::uuid,(e->>'target_node_id')::uuid,e->>'source_handle',e->>'target_handle',e->>'edge_type',e->>'label');
  end loop;
end;
$$;
revoke all on function public.apply_canvas_ai_graph(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_canvas_ai_graph(uuid,uuid,text,jsonb) to service_role;
