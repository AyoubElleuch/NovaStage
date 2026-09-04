-- NovaStage: Platform-wide announcement banner

create table if not exists public.platform_announcements (
  id text primary key default 'platform',
  message text not null default '',
  severity text not null default 'low',
  is_active boolean not null default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint platform_announcements_id_check check (id = 'platform'),
  constraint platform_announcements_message_check check (
    char_length(message) <= 280 and (not is_active or char_length(btrim(message)) > 0)
  ),
  constraint platform_announcements_severity_check check (severity in ('low', 'medium', 'high'))
);

insert into public.platform_announcements (id)
values ('platform')
on conflict (id) do nothing;

alter table public.platform_announcements enable row level security;

drop policy if exists "Anyone can view the active platform announcement." on public.platform_announcements;

create policy "Anyone can view the active platform announcement."
  on public.platform_announcements for select
  to anon, authenticated
  using (is_active = true);

grant select on public.platform_announcements to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.platform_announcements;
  end if;
exception
  when duplicate_object then null;
end $$;