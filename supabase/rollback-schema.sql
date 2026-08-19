-- NovaStage schema rollback.
-- Run this file only when you intend to remove the objects created by
-- supabase/schema.sql and all data stored in those tables.
-- This preserves Supabase's auth.users table and auth schema.

begin;

-- Remove policies before dropping the functions they call.
drop policy if exists "Users can view their own profile or permitted profiles." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

drop policy if exists "Anyone can join the waitlist." on public.waitlist;
drop policy if exists "Users with waitlist:read can view waitlist." on public.waitlist;
drop policy if exists "Users with waitlist:approve or waitlist:disapprove can update waitlist." on public.waitlist;
drop policy if exists "Users with waitlist:approve or waitlist:disapprove can delete waitlist." on public.waitlist;

drop policy if exists "Authenticated users can view permissions." on public.permissions;
drop policy if exists "Authenticated users can view roles." on public.roles;
drop policy if exists "Authenticated users can view role permissions." on public.role_permissions;
drop policy if exists "Users can view their own roles or admins can view all." on public.user_roles;
drop policy if exists "Admins can manage user roles." on public.user_roles;

drop policy if exists "Members can view their projects." on public.projects;
drop policy if exists "Authenticated users can create projects." on public.projects;
drop policy if exists "Owners can update their projects." on public.projects;
drop policy if exists "Owners can delete their projects." on public.projects;
drop policy if exists "Members can view project members." on public.project_members;
drop policy if exists "Users can join projects." on public.project_members;
drop policy if exists "Owners can update member roles." on public.project_members;
drop policy if exists "Owners can remove members or members can leave." on public.project_members;

-- Remove triggers attached to Supabase auth.users before removing their functions.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists sync_profile_email_from_auth on auth.users;
drop trigger if exists cleanup_deleted_user_data on auth.users;
drop trigger if exists promote_next_project_owner on auth.users;
drop trigger if exists set_profiles_updated_at on public.profiles;
drop trigger if exists set_projects_updated_at on public.projects;

-- Remove functions created by schema.sql.
drop function if exists public.has_permission(uuid, text);
drop function if exists public.has_role(uuid, text);
drop function if exists public.get_user_permissions(uuid);
drop function if exists public.set_profile_updated_at();
drop function if exists public.handle_new_user();
drop function if exists public.sync_profile_email_from_auth();
drop function if exists public.cleanup_deleted_user_data();
drop function if exists public.is_project_member(uuid, uuid);
drop function if exists public.is_project_owner(uuid, uuid);
drop function if exists public.set_project_updated_at();
drop function if exists public.promote_next_project_owner();

-- Drop dependent tables before the tables they reference.
drop table if exists public.project_members;
drop table if exists public.projects;
drop table if exists public.user_roles;
drop table if exists public.role_permissions;
drop table if exists public.profiles;
drop table if exists public.waitlist;
drop table if exists public.roles;
drop table if exists public.permissions;

commit;

-- Objects created by other migrations, including canvas tables, are not part
-- of schema.sql and are intentionally left untouched.
