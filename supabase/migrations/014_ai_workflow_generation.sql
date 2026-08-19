-- Migration 015: AI Workflow Generation, 10-Request Lifetime Quota, & Collision Locking

-- 1. Add ai_requests_count to profiles with hard limit constraint (max 10)
alter table public.profiles
  add column if not exists ai_requests_count int not null default 0 check (ai_requests_count >= 0 and ai_requests_count <= 10);

-- 2. Add AI generation collision lock columns to projects
alter table public.projects
  add column if not exists ai_generating_by uuid references auth.users(id) on delete set null,
  add column if not exists ai_generating_at timestamp with time zone;

-- 3. Stored procedure: Atomically consume user AI quota (hard 10 limit with row-lock)
create or replace function public.consume_user_ai_quota(p_user_id uuid)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select ai_requests_count into v_count
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User profile not found');
  end if;

  if v_count >= 10 then
    return jsonb_build_object(
      'success', false,
      'error', 'You have reached the limit of 10 AI generation requests.',
      'requests_used', v_count,
      'requests_remaining', 0
    );
  end if;

  update public.profiles
  set ai_requests_count = v_count + 1,
      updated_at = timezone('utc'::text, now())
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'requests_used', v_count + 1,
    'requests_remaining', 10 - (v_count + 1)
  );
end;
$$ language plpgsql;

-- 4. Stored procedure: Atomically rollback/restore user AI quota if external AI API fails
create or replace function public.restore_user_ai_quota(p_user_id uuid)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select ai_requests_count into v_count
  from public.profiles
  where id = p_user_id
  for update;

  if found and v_count > 0 then
    update public.profiles
    set ai_requests_count = v_count - 1,
        updated_at = timezone('utc'::text, now())
    where id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'requests_used', v_count - 1,
      'requests_remaining', 10 - (v_count - 1)
    );
  end if;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql;

-- 5. Stored procedure: Acquire project AI generation lock (prevent concurrent generation collisions)
create or replace function public.acquire_project_ai_lock(p_project_id uuid, p_user_id uuid)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_project record;
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_active_user record;
begin
  select * into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Project not found');
  end if;

  -- If another user is actively generating within the last 45 seconds, block to prevent collision
  if v_project.ai_generating_by is not null
     and v_project.ai_generating_by != p_user_id
     and v_project.ai_generating_at is not null
     and v_project.ai_generating_at > (v_now - interval '45 seconds') then
    
    select full_name, username, email into v_active_user
    from public.profiles
    where id = v_project.ai_generating_by;

    return jsonb_build_object(
      'success', false,
      'error', coalesce(v_active_user.username, v_active_user.full_name, 'Another collaborator') || ' is currently generating a workflow with AI for this project. Please wait to prevent collisions.',
      'generating_user', coalesce(v_active_user.username, v_active_user.full_name, 'A collaborator')
    );
  end if;

  -- Acquire lock for current user
  update public.projects
  set ai_generating_by = p_user_id,
      ai_generating_at = v_now
  where id = p_project_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql;

-- 6. Stored procedure: Release project AI generation lock
create or replace function public.release_project_ai_lock(p_project_id uuid, p_user_id uuid)
returns jsonb
security definer
set search_path = public
as $$
begin
  update public.projects
  set ai_generating_by = null,
      ai_generating_at = null
  where id = p_project_id and (ai_generating_by = p_user_id or created_by = p_user_id);

  return jsonb_build_object('success', true);
end;
$$ language plpgsql;
