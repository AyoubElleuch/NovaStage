-- NovaStage: Waitlist Admin Management & User Lifecycle
-- 1. Extend waitlist table with status tracking and auth user linkage
alter table public.waitlist 
  add column if not exists status text not null default 'pending',
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamp with time zone,
  add column if not exists disapproved_at timestamp with time zone;

-- Ensure status is one of the supported lifecycle states
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'waitlist_status_check'
  ) then
    alter table public.waitlist
      add constraint waitlist_status_check
      check (status in ('pending', 'approved', 'disapproved'));
  end if;
end $$;

-- 2. Add RLS Policies for Admin Access to Waitlist
create policy "Admins can view waitlist entries."
  on public.waitlist for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can update waitlist entries."
  on public.waitlist for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can delete waitlist entries."
  on public.waitlist for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- 3. Policy for Admins to view all user profiles
create policy "Admins can view all profiles."
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = auth.uid()
      and admin_profile.role in ('admin', 'super_admin')
    )
  );
