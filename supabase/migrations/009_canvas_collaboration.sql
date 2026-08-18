-- NovaStage: Canvas Nodes, Checkpoints, Edges, and Zero-Collision Claim Concurrency Schema

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- 1. Canvas Nodes (Milestone Boxes)
create table if not exists public.canvas_nodes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null default 'New Milestone',
  description text default '',
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'blocked', 'completed')),
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  width double precision not null default 280,
  height double precision not null default 170,
  color text default 'default',
  sort_order int not null default 0,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamp with time zone,
  claim_expires_at timestamp with time zone,
  version int not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Canvas Checkpoints (Sub-tasks per milestone)
create table if not exists public.canvas_checkpoints (
  id uuid default gen_random_uuid() primary key,
  node_id uuid references public.canvas_nodes(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null default 'New Checkpoint',
  is_completed boolean not null default false,
  sort_order int not null default 0,
  completed_at timestamp with time zone,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Canvas Edges (Connecting Dependency Links)
create table if not exists public.canvas_edges (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  source_node_id uuid references public.canvas_nodes(id) on delete cascade not null,
  target_node_id uuid references public.canvas_nodes(id) on delete cascade not null,
  source_handle text not null default 'right',
  target_handle text not null default 'left',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint no_self_loops check (source_node_id != target_node_id),
  constraint unique_edge_connection unique (source_node_id, target_node_id, source_handle, target_handle)
);

-- 4. Canvas Claim Requests (Collaborative Handoff Requests)
create table if not exists public.canvas_claim_requests (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  node_id uuid references public.canvas_nodes(id) on delete cascade not null,
  requester_id uuid references auth.users(id) on delete cascade not null,
  current_holder_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'granted', 'declined', 'expired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_canvas_nodes_project_id on public.canvas_nodes(project_id);
create index if not exists idx_canvas_nodes_claimed_by on public.canvas_nodes(claimed_by);
create index if not exists idx_canvas_checkpoints_node_id on public.canvas_checkpoints(node_id);
create index if not exists idx_canvas_checkpoints_project_id on public.canvas_checkpoints(project_id);
create index if not exists idx_canvas_edges_project_id on public.canvas_edges(project_id);
create index if not exists idx_canvas_edges_source_target on public.canvas_edges(source_node_id, target_node_id);
create index if not exists idx_canvas_claim_requests_project_node on public.canvas_claim_requests(project_id, node_id);
create index if not exists idx_canvas_claim_requests_current_holder on public.canvas_claim_requests(current_holder_id, status);

-- -----------------------------------------------------------------------------
-- Stored Procedures for Atomic Concurrency & Claim Control
-- -----------------------------------------------------------------------------

-- 1. Atomic Claim Lock Acquisition
create or replace function public.claim_canvas_node(
  p_node_id uuid,
  p_user_id uuid,
  p_duration_minutes int default 5
)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_node record;
  v_now timestamp with time zone := timezone('utc'::text, now());
begin
  -- Select node with lock
  select * into v_node
  from public.canvas_nodes
  where id = p_node_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Node not found');
  end if;

  -- Verify project membership
  if not public.is_project_member(v_node.project_id, p_user_id) then
    return jsonb_build_object('success', false, 'error', 'Not a project member');
  end if;

  -- Check if already claimed by another active user
  if v_node.claimed_by is not null
     and v_node.claimed_by != p_user_id
     and v_node.claim_expires_at > v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'Already claimed',
      'claimed_by', v_node.claimed_by,
      'claim_expires_at', v_node.claim_expires_at
    );
  end if;

  -- Acquire or renew claim
  update public.canvas_nodes
  set claimed_by = p_user_id,
      claimed_at = v_now,
      claim_expires_at = v_now + (p_duration_minutes || ' minutes')::interval,
      version = version + 1,
      updated_at = v_now
  where id = p_node_id;

  return jsonb_build_object(
    'success', true,
    'claimed_by', p_user_id,
    'claim_expires_at', v_now + (p_duration_minutes || ' minutes')::interval
  );
end;
$$ language plpgsql;

-- 2. Voluntary Claim Release
create or replace function public.release_canvas_node(
  p_node_id uuid,
  p_user_id uuid
)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_node record;
begin
  select * into v_node
  from public.canvas_nodes
  where id = p_node_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Node not found');
  end if;

  -- Only the claim holder or project owner can release
  if v_node.claimed_by = p_user_id or public.is_project_owner(v_node.project_id, p_user_id) then
    update public.canvas_nodes
    set claimed_by = null,
        claimed_at = null,
        claim_expires_at = null,
        version = version + 1,
        updated_at = timezone('utc'::text, now())
    where id = p_node_id;

    return jsonb_build_object('success', true);
  else
    return jsonb_build_object('success', false, 'error', 'Permission denied');
  end if;
end;
$$ language plpgsql;

-- 3. Extend Claim Heartbeat
create or replace function public.extend_canvas_node_claim(
  p_node_id uuid,
  p_user_id uuid,
  p_duration_minutes int default 5
)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_now timestamp with time zone := timezone('utc'::text, now());
begin
  update public.canvas_nodes
  set claim_expires_at = v_now + (p_duration_minutes || ' minutes')::interval,
      updated_at = v_now
  where id = p_node_id and claimed_by = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Lock not held by user');
  end if;

  return jsonb_build_object('success', true, 'claim_expires_at', v_now + (p_duration_minutes || ' minutes')::interval);
end;
$$ language plpgsql;

-- 4. Handoff Claim Transfer
create or replace function public.transfer_canvas_claim(
  p_request_id uuid,
  p_owner_id uuid,
  p_accept boolean
)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_req record;
  v_now timestamp with time zone := timezone('utc'::text, now());
begin
  select * into v_req
  from public.canvas_claim_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Request not found or resolved');
  end if;

  if v_req.current_holder_id != p_owner_id and not public.is_project_owner(v_req.project_id, p_owner_id) then
    return jsonb_build_object('success', false, 'error', 'Not authorized to resolve this claim');
  end if;

  if p_accept then
    -- Transfer claim to requester
    update public.canvas_nodes
    set claimed_by = v_req.requester_id,
        claimed_at = v_now,
        claim_expires_at = v_now + interval '5 minutes',
        version = version + 1,
        updated_at = v_now
    where id = v_req.node_id;

    update public.canvas_claim_requests
    set status = 'granted',
        resolved_at = v_now
    where id = p_request_id;

    return jsonb_build_object('success', true, 'status', 'granted', 'new_owner', v_req.requester_id);
  else
    update public.canvas_claim_requests
    set status = 'declined',
        resolved_at = v_now
    where id = p_request_id;

    return jsonb_build_object('success', true, 'status', 'declined');
  end if;
end;
$$ language plpgsql;

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

alter table public.canvas_nodes enable row level security;
alter table public.canvas_checkpoints enable row level security;
alter table public.canvas_edges enable row level security;
alter table public.canvas_claim_requests enable row level security;

-- 1. Canvas Nodes RLS
create policy "Members can view canvas nodes."
  on public.canvas_nodes for select
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

create policy "Members can insert canvas nodes."
  on public.canvas_nodes for insert
  to authenticated
  with check (public.is_project_member(project_id, auth.uid()));

create policy "Members can update canvas nodes."
  on public.canvas_nodes for update
  to authenticated
  using (public.is_project_member(project_id, auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()));

create policy "Members can delete canvas nodes."
  on public.canvas_nodes for delete
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

-- 2. Canvas Checkpoints RLS
create policy "Members can view checkpoints."
  on public.canvas_checkpoints for select
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

create policy "Members can insert checkpoints."
  on public.canvas_checkpoints for insert
  to authenticated
  with check (public.is_project_member(project_id, auth.uid()));

create policy "Members can update checkpoints."
  on public.canvas_checkpoints for update
  to authenticated
  using (public.is_project_member(project_id, auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()));

create policy "Members can delete checkpoints."
  on public.canvas_checkpoints for delete
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

-- 3. Canvas Edges RLS
create policy "Members can view edges."
  on public.canvas_edges for select
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

create policy "Members can insert edges."
  on public.canvas_edges for insert
  to authenticated
  with check (public.is_project_member(project_id, auth.uid()));

create policy "Members can update edges."
  on public.canvas_edges for update
  to authenticated
  using (public.is_project_member(project_id, auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()));

create policy "Members can delete edges."
  on public.canvas_edges for delete
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

-- 4. Canvas Claim Requests RLS
create policy "Members can view claim requests."
  on public.canvas_claim_requests for select
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

create policy "Members can insert claim requests."
  on public.canvas_claim_requests for insert
  to authenticated
  with check (public.is_project_member(project_id, auth.uid()) and requester_id = auth.uid());

create policy "Members can update their own claim requests."
  on public.canvas_claim_requests for update
  to authenticated
  using (public.is_project_member(project_id, auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()));
