-- NovaStage: Project Join Requests & Automatic Kick-Ban System

-- 1. Project Banned Members (Blocklist)
create table if not exists public.project_banned_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  banned_by uuid references auth.users(id) on delete set null,
  reason text default 'Removed by project owner',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_project_banned_user unique (project_id, user_id)
);

-- 2. Project Join Requests (Approval Queue)
create table if not exists public.project_join_requests (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  resolved_by uuid references auth.users(id) on delete set null
);

-- Indexes
create index if not exists idx_project_banned_members_project on public.project_banned_members(project_id);
create index if not exists idx_project_banned_members_user on public.project_banned_members(user_id);
create index if not exists idx_project_join_requests_project on public.project_join_requests(project_id, status);
create index if not exists idx_project_join_requests_user on public.project_join_requests(user_id, status);

-- Enable RLS
alter table public.project_banned_members enable row level security;
alter table public.project_join_requests enable row level security;

-- Policies for Project Banned Members
create policy "Owners can view banned members."
  on public.project_banned_members for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.created_by = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'owner'
      ))
    )
  );

-- Policies for Project Join Requests
create policy "Users can view their own join requests."
  on public.project_join_requests for select
  to authenticated
  using (user_id = auth.uid());

create policy "Owners can view project join requests."
  on public.project_join_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.created_by = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'owner'
      ))
    )
  );

create policy "Users can insert join requests for themselves."
  on public.project_join_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- Register tables with supabase_realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_banned_members;
    alter publication supabase_realtime add table public.project_join_requests;
  end if;
exception
  when duplicate_object then null;
end $$;
