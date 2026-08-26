-- Migration 016: Fix identity-trust vulnerability in AI quota and collision lock functions
-- Drops insecure client-supplied p_user_id parameters and derives acting user via auth.uid()
-- Enforces roles:manage permission check on administrative reset functions

-- 1. Drop previous signatures that accepted caller-supplied user IDs
drop function if exists public.consume_user_ai_quota(uuid);
drop function if exists public.restore_user_ai_quota(uuid);
drop function if exists public.acquire_project_ai_lock(uuid, uuid);
drop function if exists public.release_project_ai_lock(uuid, uuid);

-- 2. Secure consume_user_ai_quota: derives caller from auth.uid()
create or replace function public.consume_user_ai_quota()
returns jsonb
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  select ai_requests_count into v_count
  from public.profiles
  where id = v_user_id
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
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'requests_used', v_count + 1,
    'requests_remaining', 10 - (v_count + 1)
  );
end;
$$ language plpgsql;

-- 3. Secure restore_user_ai_quota: derives caller from auth.uid()
create or replace function public.restore_user_ai_quota()
returns jsonb
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  select ai_requests_count into v_count
  from public.profiles
  where id = v_user_id
  for update;

  if found and v_count > 0 then
    update public.profiles
    set ai_requests_count = v_count - 1,
        updated_at = timezone('utc'::text, now())
    where id = v_user_id;

    return jsonb_build_object(
      'success', true,
      'requests_used', v_count - 1,
      'requests_remaining', 10 - (v_count - 1)
    );
  end if;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql;

-- 4. Secure acquire_project_ai_lock: derives caller from auth.uid()
create or replace function public.acquire_project_ai_lock(p_project_id uuid)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_project record;
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_active_user record;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Project not found');
  end if;

  if v_project.ai_generating_by is not null
     and v_project.ai_generating_by != v_user_id
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

  update public.projects
  set ai_generating_by = v_user_id,
      ai_generating_at = v_now
  where id = p_project_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql;

-- 5. Secure release_project_ai_lock: derives caller from auth.uid()
create or replace function public.release_project_ai_lock(p_project_id uuid)
returns jsonb
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  update public.projects
  set ai_generating_by = null,
      ai_generating_at = null
  where id = p_project_id and (ai_generating_by = v_user_id or created_by = v_user_id);

  return jsonb_build_object('success', true);
end;
$$ language plpgsql;

-- 6. Secure reset_user_ai_quota: requires roles:manage permission
create or replace function public.reset_user_ai_quota(p_user_id uuid)
returns jsonb
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_permission(auth.uid(), 'roles:manage') then
    return jsonb_build_object('success', false, 'error', 'Forbidden: Insufficient permissions');
  end if;

  update public.profiles
  set ai_requests_count = 0,
      updated_at = timezone('utc'::text, now())
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User profile not found');
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'requests_used', 0,
    'requests_remaining', 10
  );
end;
$$ language plpgsql;

-- 7. Secure reset_all_users_ai_quota: requires roles:manage permission
create or replace function public.reset_all_users_ai_quota()
returns jsonb
security definer
set search_path = public
as $$
declare
  v_updated_count int;
begin
  if auth.uid() is null or not public.has_permission(auth.uid(), 'roles:manage') then
    return jsonb_build_object('success', false, 'error', 'Forbidden: Insufficient permissions');
  end if;

  update public.profiles
  set ai_requests_count = 0,
      updated_at = timezone('utc'::text, now());
  
  get diagnostics v_updated_count = row_count;

  return jsonb_build_object(
    'success', true,
    'users_reset', v_updated_count
  );
end;
$$ language plpgsql;
