-- NovaStage: Public Waitlist
create table if not exists public.waitlist (
  email text primary key,
  provider text not null default 'email',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.waitlist enable row level security;

create policy "Anyone can join the waitlist."
  on public.waitlist for insert
  with check (true);