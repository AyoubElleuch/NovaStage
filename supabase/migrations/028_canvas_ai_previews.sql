create table public.canvas_ai_previews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('workflow','aws_architecture')),
  graph jsonb not null,
  baseline text not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  applied_at timestamptz
);
alter table public.canvas_ai_previews enable row level security;
create index on public.canvas_ai_previews(project_id,user_id,created_at desc);
grant all on public.canvas_ai_previews to service_role;

-- Claims and heartbeat timestamps do not invalidate a preview; content changes do.
create function public.canvas_content_fingerprint(p_project_id uuid) returns text
language sql stable security definer set search_path=public as $$
  select md5(jsonb_build_array(
    (select coalesce(jsonb_agg(to_jsonb(n)-array['claimed_by','claimed_at','claim_expires_at','updated_at'] order by id),'[]') from public.canvas_nodes n where project_id=p_project_id),
    (select coalesce(jsonb_agg(to_jsonb(c)-array['updated_at'] order by id),'[]') from public.canvas_checkpoints c where project_id=p_project_id),
    (select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.canvas_edges e where project_id=p_project_id)
  )::text)
$$;
revoke all on function public.canvas_content_fingerprint(uuid) from public, anon, authenticated;
grant execute on function public.canvas_content_fingerprint(uuid) to service_role;

create function public.accept_canvas_ai_preview(p_preview_id uuid, p_project_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare preview public.canvas_ai_previews;
begin
  perform 1 from public.projects where id=p_project_id for update;
  if not found or exists (select 1 from public.project_banned_members where project_id=p_project_id and user_id=p_user_id)
    or not (exists (select 1 from public.projects where id=p_project_id and created_by=p_user_id)
      or exists (select 1 from public.project_members where project_id=p_project_id and user_id=p_user_id))
    then raise exception 'Project access denied'; end if;
  select * into preview from public.canvas_ai_previews
    where id=p_preview_id and project_id=p_project_id and user_id=p_user_id for update;
  if not found then raise exception 'Preview not found'; end if;
  if preview.applied_at is not null then return; end if;
  if preview.expires_at < now() then raise exception 'Preview expired; generate a new preview'; end if;
  -- Block concurrent table writes until the fingerprint check and graph commit finish.
  lock table public.canvas_nodes, public.canvas_checkpoints, public.canvas_edges in share row exclusive mode;
  if preview.baseline <> public.canvas_content_fingerprint(p_project_id)
    then raise exception 'Canvas changed; generate a new preview'; end if;
  perform public.apply_canvas_ai_graph(p_project_id,p_user_id,preview.mode,preview.graph);
  update public.canvas_ai_previews set applied_at=now() where id=preview.id;
end $$;
revoke all on function public.accept_canvas_ai_preview(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.accept_canvas_ai_preview(uuid,uuid,uuid) to service_role;
