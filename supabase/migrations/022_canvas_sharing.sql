-- Share links are independent of membership and grant no database access.
-- Only server code using the service role may read or manage these tokens.
create table public.canvas_shares (
  project_id uuid primary key references public.projects(id) on delete cascade,
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.canvas_shares enable row level security;
revoke all on public.canvas_shares from anon, authenticated;
grant all on public.canvas_shares to service_role;
