-- NovaStage: Enterprise Role-Based Access Control (RBAC) & Permissions (PBAC)

-- 1. Create Permissions Table
create table if not exists public.permissions (
  id text primary key,
  name text not null,
  description text,
  category text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Roles Table
create table if not exists public.roles (
  id text primary key,
  name text not null,
  description text,
  is_system boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Role-Permissions Junction Table
create table if not exists public.role_permissions (
  role_id text references public.roles(id) on delete cascade not null,
  permission_id text references public.permissions(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (role_id, permission_id)
);

-- 4. Create User-Roles Junction Table
create table if not exists public.user_roles (
  user_id uuid references auth.users(id) on delete cascade not null,
  role_id text references public.roles(id) on delete cascade not null,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, role_id)
);

-- 5. Seed Core Permissions
insert into public.permissions (id, name, description, category)
values
  ('admin:access', 'Access Admin Console', 'Allows accessing the /admin administrative dashboard', 'admin'),
  ('waitlist:read', 'View Waitlist', 'Allows viewing waitlist submissions and applicants', 'waitlist'),
  ('waitlist:approve', 'Approve Waitlist Applicants', 'Allows approving applicants and creating user accounts', 'waitlist'),
  ('waitlist:disapprove', 'Disapprove Waitlist Applicants', 'Allows marking waitlist submissions as disapproved', 'waitlist'),
  ('users:read', 'View User Profiles', 'Allows viewing member profiles and details', 'users'),
  ('users:manage', 'Manage User Roles', 'Allows assigning and modifying user roles', 'users'),
  ('roles:manage', 'Manage Roles & Permissions', 'Allows modifying roles and granting permissions', 'system')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;

-- 6. Seed Core Roles
insert into public.roles (id, name, description, is_system)
values
  ('super_admin', 'Super Administrator', 'Full unrestricted control across all system capabilities and data', true),
  ('admin', 'Administrator', 'Administrative access to manage waitlists and review platform users', true),
  ('developer', 'Developer', 'Standard developer account with workspace and API sandbox access', true),
  ('viewer', 'Viewer', 'Read-only observer access to permitted resources', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system;

-- 7. Seed Role-Permission Mappings
-- Super Admin gets all permissions
insert into public.role_permissions (role_id, permission_id)
select 'super_admin', id from public.permissions
on conflict do nothing;

-- Admin gets administrative & waitlist permissions
insert into public.role_permissions (role_id, permission_id)
values
  ('admin', 'admin:access'),
  ('admin', 'waitlist:read'),
  ('admin', 'waitlist:approve'),
  ('admin', 'waitlist:disapprove'),
  ('admin', 'users:read')
on conflict do nothing;

-- Viewer gets read permissions
insert into public.role_permissions (role_id, permission_id)
values
  ('viewer', 'waitlist:read'),
  ('viewer', 'users:read')
on conflict do nothing;

-- 8. PostgreSQL Security Definer Helper Functions

-- Function: has_permission(user_id, permission)
create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean as $$
declare
  v_has boolean;
begin
  -- 1. If user is super_admin, grant unconditionally
  if exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role_id = 'super_admin'
  ) then
    return true;
  end if;

  -- 2. Check if user holds any role that grants the requested permission
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on ur.role_id = rp.role_id
    where ur.user_id = p_user_id
    and rp.permission_id = p_permission
  ) into v_has;

  return v_has;
end;
$$ language plpgsql security definer;

-- Function: has_role(user_id, role)
create or replace function public.has_role(p_user_id uuid, p_role text)
returns boolean as $$
begin
  if p_role = 'admin' then
    return exists (
      select 1 from public.user_roles
      where user_id = p_user_id and role_id in ('admin', 'super_admin')
    );
  end if;

  return exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role_id = p_role
  );
end;
$$ language plpgsql security definer;

-- Function: get_user_permissions(user_id)
create or replace function public.get_user_permissions(p_user_id uuid)
returns table (permission_id text, name text, category text) as $$
begin
  -- If super_admin, return all system permissions
  if exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role_id = 'super_admin'
  ) then
    return query
    select p.id as permission_id, p.name, p.category
    from public.permissions p;
  else
    return query
    select distinct p.id as permission_id, p.name, p.category
    from public.user_roles ur
    join public.role_permissions rp on ur.role_id = rp.role_id
    join public.permissions p on rp.permission_id = p.id
    where ur.user_id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- 9. Update handle_new_user() Trigger to assign default 'developer' role
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'developer');

  -- Insert profile
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    role = coalesce(excluded.role, public.profiles.role),
    updated_at = timezone('utc'::text, now());

  -- Assign user role in user_roles table
  insert into public.user_roles (user_id, role_id)
  values (new.id, v_role)
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- 10. Enable RLS on RBAC Tables
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

-- Policies for RBAC Tables
create policy "Authenticated users can view permissions."
  on public.permissions for select
  to authenticated
  using (true);

create policy "Authenticated users can view roles."
  on public.roles for select
  to authenticated
  using (true);

create policy "Authenticated users can view role permissions."
  on public.role_permissions for select
  to authenticated
  using (true);

create policy "Users can view their own roles or admins can view all."
  on public.user_roles for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.has_permission(auth.uid(), 'users:read')
  );

create policy "Admins can manage user roles."
  on public.user_roles for all
  to authenticated
  using (public.has_permission(auth.uid(), 'users:manage'))
  with check (public.has_permission(auth.uid(), 'users:manage'));

-- 11. Refine Waitlist RLS using permission functions
drop policy if exists "Admins can view waitlist entries." on public.waitlist;
drop policy if exists "Admins can update waitlist entries." on public.waitlist;
drop policy if exists "Admins can delete waitlist entries." on public.waitlist;

create policy "Users with waitlist:read can view waitlist."
  on public.waitlist for select
  to authenticated
  using (public.has_permission(auth.uid(), 'waitlist:read'));

create policy "Users with waitlist:approve or waitlist:disapprove can update waitlist."
  on public.waitlist for update
  to authenticated
  using (
    public.has_permission(auth.uid(), 'waitlist:approve')
    or public.has_permission(auth.uid(), 'waitlist:disapprove')
  );

