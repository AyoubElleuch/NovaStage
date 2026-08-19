-- Fix Realtime delivery of ban events and database helper functions

-- 1. Allow users to view their own ban record so Supabase Realtime CDC delivers INSERT events
drop policy if exists "Users can view their own ban status." on public.project_banned_members;

create policy "Users can view their own ban status."
  on public.project_banned_members for select
  to authenticated
  using (user_id = auth.uid());

-- 2. Update is_project_member to explicitly block banned users
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.project_banned_members
    where project_id = p_project_id and user_id = p_user_id
  ) then
    return false;
  end if;

  return exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
end;
$$ language plpgsql;

create or replace function public.is_project_owner(p_project_id uuid, p_user_id uuid)
returns boolean
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.project_banned_members
    where project_id = p_project_id and user_id = p_user_id
  ) then
    return false;
  end if;

  return exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id and role = 'owner'
  );
end;
$$ language plpgsql;
