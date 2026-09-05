-- Migration 020: Dynamic Tier Quotas & Enhanced Member Capacity
-- Removes the hard 10-quota check constraint and allows tier-based AI quotas

-- 1. Relax check constraint on profiles(ai_requests_count) to allow counts for Plus (30) and Pro (50)
alter table public.profiles drop constraint if exists profiles_ai_requests_count_check;
alter table public.profiles add constraint profiles_ai_requests_count_check check (ai_requests_count >= 0);

-- 2. Update consume_user_ai_quota to dynamically enforce tier limits
create or replace function public.consume_user_ai_quota()
returns jsonb
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
  v_plan text;
  v_max int;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  select ai_requests_count, coalesce(plan, 'free') into v_count, v_plan
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User profile not found');
  end if;

  if v_plan = 'enterprise' then
    v_max := 999999;
  elsif v_plan = 'pro' then
    v_max := 50;
  elsif v_plan = 'plus' then
    v_max := 30;
  else
    v_max := 10;
  end if;

  if v_count >= v_max then
    return jsonb_build_object(
      'success', false,
      'error', format('You have reached your limit of %s AI generation requests.', v_max),
      'requests_used', v_count,
      'requests_remaining', 0,
      'max_requests', v_max
    );
  end if;

  update public.profiles
  set ai_requests_count = v_count + 1,
      updated_at = timezone('utc'::text, now())
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'requests_used', v_count + 1,
    'requests_remaining', v_max - (v_count + 1),
    'max_requests', v_max
  );
end;
$$ language plpgsql;
