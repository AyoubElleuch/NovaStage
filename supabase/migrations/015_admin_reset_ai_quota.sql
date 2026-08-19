-- Migration 015: Admin AI Quota Management & Bulk Reset Helper Functions

-- 1. Function: Reset AI quota for a specific user
create or replace function public.reset_user_ai_quota(p_user_id uuid)
returns jsonb
security definer
set search_path = public
as $$
begin
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

-- 2. Function: Reset AI quota for all users across the platform
create or replace function public.reset_all_users_ai_quota()
returns jsonb
security definer
set search_path = public
as $$
declare
  v_updated_count int;
begin
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
