-- NovaStage: Projects and Project Members schema with ownership succession and RLS

-- -----------------------------------------------------------------------------
-- Tables
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

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_projects_slug on public.projects(slug);
create index if not exists idx_projects_invite_code on public.projects(invite_code);
create index if not exists idx_projects_created_by on public.projects(created_by);
create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_project_members_joined_at on public.project_members(joined_at asc);

-- -----------------------------------------------------------------------------
-- Helper functions for RLS (Security Definer to prevent policy recursion)
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- 1. Auto-update projects.updated_at
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

-- 2. Ownership succession on user account deletion
create or replace function public.promote_next_project_owner()
returns trigger
security definer
set search_path = public
as $$
declare
  v_project record;
  v_next_user uuid;
begin
  -- For each project where the deleted user was the owner
  for v_project in
    select project_id from public.project_members
    where user_id = old.id and role = 'owner'
  loop
    -- Find the earliest collaborator who joined
    select user_id into v_next_user
    from public.project_members
    where project_id = v_project.project_id
      and user_id != old.id
    order by joined_at asc
    limit 1;

    if v_next_user is not null then
      -- Promote the earliest collaborator to owner
      update public.project_members
      set role = 'owner'
      where project_id = v_project.project_id
        and user_id = v_next_user;

      -- Update created_by reference to point to the active owner
      update public.projects
      set created_by = v_next_user
      where id = v_project.project_id;
    else
      -- No collaborators left — delete the orphaned project
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

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- Projects policies
drop policy if exists "Members can view their projects." on public.projects;
drop policy if exists "Authenticated users can create projects." on public.projects;
drop policy if exists "Owners can update their projects." on public.projects;
drop policy if exists "Owners can delete their projects." on public.projects;

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

-- Project Members policies
drop policy if exists "Members can view project members." on public.project_members;
drop policy if exists "Users can join projects." on public.project_members;
drop policy if exists "Owners can update member roles." on public.project_members;
drop policy if exists "Owners can remove members or members can leave." on public.project_members;

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
