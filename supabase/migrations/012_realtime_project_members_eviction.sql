-- Enable real-time replication for project_members and project_banned_members
-- to ensure immediate eviction when a collaborator is removed.

alter table public.project_members replica identity full;
alter table public.project_banned_members replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_members;
    alter publication supabase_realtime add table public.project_banned_members;
  end if;
exception
  when duplicate_object then null;
end $$;
