-- NovaStage production bootstrap schema.
-- Run this one file on a fresh Supabase project.
-- For an existing project that already uses Supabase migrations, run:
--   supabase db push

-- -----------------------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  username text,
  avatar_url text,
  role text default 'developer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.waitlist (
  email text primary key,
  provider text not null default 'email',
  status text not null default 'pending',
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  approved_at timestamp with time zone,
  disapproved_at timestamp with time zone
);

alter table public.waitlist add column if not exists status text not null default 'pending';
alter table public.waitlist add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.waitlist add column if not exists approved_at timestamp with time zone;
alter table public.waitlist add column if not exists disapproved_at timestamp with time zone;

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

create table if not exists public.permissions (
  id text primary key,
  name text not null,
  description text,
  category text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.roles (
  id text primary key,
  name text not null,
  description text,
  is_system boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.role_permissions (
  role_id text references public.roles(id) on delete cascade not null,
  permission_id text references public.permissions(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid references auth.users(id) on delete cascade not null,
  role_id text references public.roles(id) on delete cascade not null,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, role_id)
);

-- -----------------------------------------------------------------------------
-- Authorization functions
-- -----------------------------------------------------------------------------

create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean
security definer
set search_path = public
as $$
declare
  v_has boolean;
begin
  if exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role_id = 'super_admin'
  ) then
    return true;
  end if;

  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on ur.role_id = rp.role_id
    where ur.user_id = p_user_id
      and rp.permission_id = p_permission
  ) into v_has;

  return v_has;
end;
$$ language plpgsql;

create or replace function public.has_role(p_user_id uuid, p_role text)
returns boolean
security definer
set search_path = public
as $$
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
$$ language plpgsql;

create or replace function public.get_user_permissions(p_user_id uuid)
returns table (permission_id text, name text, category text)
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role_id = 'super_admin'
  ) then
    return query
      select p.id, p.name, p.category from public.permissions p;
  else
    return query
      select distinct p.id, p.name, p.category
      from public.user_roles ur
      join public.role_permissions rp on ur.role_id = rp.role_id
      join public.permissions p on rp.permission_id = p.id
      where ur.user_id = p_user_id;
  end if;
end;
$$ language plpgsql;

-- -----------------------------------------------------------------------------
-- Profile and Auth synchronization
-- -----------------------------------------------------------------------------

create or replace function public.set_profile_updated_at()
returns trigger
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'developer');

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

  insert into public.user_roles (user_id, role_id)
  values (new.id, v_role)
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email_from_auth()
returns trigger
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email,
        updated_at = timezone('utc'::text, now())
    where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_profile_email_from_auth on auth.users;

create trigger sync_profile_email_from_auth
  after update of email on auth.users
  for each row execute function public.sync_profile_email_from_auth();

create or replace function public.cleanup_deleted_user_data()
returns trigger
security definer
set search_path = public
as $$
begin
  delete from public.waitlist where auth_user_id = old.id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists cleanup_deleted_user_data on auth.users;

create trigger cleanup_deleted_user_data
  before delete on auth.users
  for each row execute function public.cleanup_deleted_user_data();

-- -----------------------------------------------------------------------------
-- Seed roles and permissions
-- -----------------------------------------------------------------------------

insert into public.permissions (id, name, description, category)
values
  ('admin:access', 'Access Admin Console', 'Allows accessing the /admin administrative dashboard', 'admin'),
  ('waitlist:read', 'View Waitlist', 'Allows viewing waitlist submissions and applicants', 'waitlist'),
  ('waitlist:approve', 'Approve Waitlist Applicants', 'Allows approving applicants and creating user accounts', 'waitlist'),
  ('waitlist:disapprove', 'Disapprove Waitlist Applicants', 'Allows marking waitlist applicants as disapproved', 'waitlist'),
  ('users:read', 'View User Profiles', 'Allows viewing member profiles and details', 'users'),
  ('users:manage', 'Manage User Roles', 'Allows assigning and modifying user roles', 'users'),
  ('roles:manage', 'Manage Roles & Permissions', 'Allows modifying roles and granting permissions', 'system')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;

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

insert into public.role_permissions (role_id, permission_id)
select 'super_admin', id from public.permissions
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
values
  ('admin', 'admin:access'),
  ('admin', 'waitlist:read'),
  ('admin', 'waitlist:approve'),
  ('admin', 'waitlist:disapprove'),
  ('admin', 'users:read'),
  ('viewer', 'waitlist:read'),
  ('viewer', 'users:read')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Row-level security policies
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.waitlist enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Admins can view all profiles." on public.profiles;
drop policy if exists "Users can view their own profile or permitted profiles." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

create policy "Users can view their own profile or permitted profiles."
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.has_permission(auth.uid(), 'users:read'));

create policy "Users can insert their own profile."
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile."
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Anyone can join the waitlist." on public.waitlist;
drop policy if exists "Admins can view waitlist entries." on public.waitlist;
drop policy if exists "Admins can update waitlist entries." on public.waitlist;
drop policy if exists "Admins can delete waitlist entries." on public.waitlist;
drop policy if exists "Users with waitlist:read can view waitlist." on public.waitlist;
drop policy if exists "Users with waitlist:approve or waitlist:disapprove can update waitlist." on public.waitlist;
drop policy if exists "Users with waitlist:approve or waitlist:disapprove can delete waitlist." on public.waitlist;

create policy "Anyone can join the waitlist."
  on public.waitlist for insert
  with check (true);

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

create policy "Users with waitlist:approve or waitlist:disapprove can delete waitlist."
  on public.waitlist for delete
  to authenticated
  using (
    public.has_permission(auth.uid(), 'waitlist:approve')
    or public.has_permission(auth.uid(), 'waitlist:disapprove')
  );

drop policy if exists "Authenticated users can view permissions." on public.permissions;
drop policy if exists "Authenticated users can view roles." on public.roles;
drop policy if exists "Authenticated users can view role permissions." on public.role_permissions;
drop policy if exists "Users can view their own roles or admins can view all." on public.user_roles;
drop policy if exists "Admins can manage user roles." on public.user_roles;

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
  using (auth.uid() = user_id or public.has_permission(auth.uid(), 'users:read'));

create policy "Admins can manage user roles."
  on public.user_roles for all
  to authenticated
  using (public.has_permission(auth.uid(), 'users:manage'))
  with check (public.has_permission(auth.uid(), 'users:manage'));

-- -----------------------------------------------------------------------------
-- Projects and Project Members
-- -----------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  name text not null,
  description text,
  invite_code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'collaborator' check (role in ('owner', 'collaborator')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (project_id, user_id)
);

create index if not exists idx_projects_slug on public.projects(slug);
create index if not exists idx_projects_invite_code on public.projects(invite_code);
create index if not exists idx_projects_created_by on public.projects(created_by);
create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_project_members_joined_at on public.project_members(joined_at asc);

create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
security definer
set search_path = public
as $$
begin
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
  return exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id and role = 'owner'
  );
end;
$$ language plpgsql;

create or replace function public.set_project_updated_at()
returns trigger
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_projects_updated_at on public.projects;

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_project_updated_at();

create or replace function public.promote_next_project_owner()
returns trigger
security definer
set search_path = public
as $$
declare
  v_project record;
  v_next_user uuid;
begin
  for v_project in
    select project_id from public.project_members
    where user_id = old.id and role = 'owner'
  loop
    select user_id into v_next_user
    from public.project_members
    where project_id = v_project.project_id
      and user_id != old.id
    order by joined_at asc
    limit 1;

    if v_next_user is not null then
      update public.project_members
      set role = 'owner'
      where project_id = v_project.project_id
        and user_id = v_next_user;

      update public.projects
      set created_by = v_next_user
      where id = v_project.project_id;
    else
      delete from public.projects
      where id = v_project.project_id;
    end if;
  end loop;

  return old;
end;
$$ language plpgsql;

drop trigger if exists promote_next_project_owner on auth.users;

create trigger promote_next_project_owner
  before delete on auth.users
  for each row execute function public.promote_next_project_owner();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "Members can view their projects."
  on public.projects for select
  to authenticated
  using (created_by = auth.uid() or public.is_project_member(id, auth.uid()));

create policy "Authenticated users can create projects."
  on public.projects for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Owners can update their projects."
  on public.projects for update
  to authenticated
  using (public.is_project_owner(id, auth.uid()))
  with check (public.is_project_owner(id, auth.uid()));

create policy "Owners can delete their projects."
  on public.projects for delete
  to authenticated
  using (public.is_project_owner(id, auth.uid()));

create policy "Members can view project members."
  on public.project_members for select
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

create policy "Users can join projects."
  on public.project_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Owners can update member roles."
  on public.project_members for update
  to authenticated
  using (public.is_project_owner(project_id, auth.uid()))
  with check (public.is_project_owner(project_id, auth.uid()));

create policy "Owners can remove members or members can leave."
  on public.project_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_project_owner(project_id, auth.uid())
  );