-- Keep geometry writes all-or-nothing and reject stale collaborators.
create or replace function public.apply_canvas_layout (p_project_id uuid, p_user_id uuid, p_nodes jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  item jsonb;
  saved public.canvas_nodes;
  versions jsonb := '{}'::jsonb;
begin
  perform
    1
  from
    public.projects
  where
    id = p_project_id
  for update;
  if not found or exists (
    select
      1
    from
      public.project_banned_members
    where
      project_id = p_project_id and user_id = p_user_id) or not (exists (
  select
    1
  from
    public.projects
  where
    id = p_project_id and created_by = p_user_id) or exists (
  select
    1
  from
    public.project_members
  where
    project_id = p_project_id and user_id = p_user_id)) then
    raise exception 'Project access denied';
  end if;
  if jsonb_typeof(p_nodes) is distinct from 'array' or jsonb_array_length(p_nodes)
    not between 1 and 1000 then
    raise exception 'Invalid layout';
  end if;
  if (
    select
      count(distinct value ->> 'id')
    from
      jsonb_array_elements(p_nodes)) <> jsonb_array_length(p_nodes) then
    raise exception 'Duplicate layout resource';
  end if;
  for item in
  select
    value
  from
    jsonb_array_elements(p_nodes)
  order by
    value ->> 'id' loop
      select
        *
      into
        saved
      from
        public.canvas_nodes
      where
        id = (item ->> 'id')::uuid
        and project_id = p_project_id
      for update;
      if not found or saved.version is distinct from (item ->> 'version')::integer then
        raise exception 'Stale layout; refresh before retrying';
      end if;
      if item ->> 'position_x' is null or item ->> 'position_y' is null or not (abs((item ->> 'position_x') ::double precision) <= 10000000) or not (abs((item ->> 'position_y') ::double precision) <= 10000000) or not (coalesce((item ->> 'width') ::double precision, saved.width) between 1 and 100000) or not (coalesce((item ->> 'height') ::double precision, saved.height) between 1 and 100000) then
        raise exception 'Invalid geometry';
      end if;
      update
        public.canvas_nodes
      set
        position_x = (item ->> 'position_x') ::double precision,
        position_y = (item ->> 'position_y') ::double precision,
        width = coalesce((item ->> 'width') ::double precision, saved.width),
        height = coalesce((item ->> 'height') ::double precision, saved.height),
        version = version + 1,
        updated_at = now()
      where
        id = saved.id;
      versions := versions || jsonb_build_object(saved.id::text, saved.version + 1);
    end loop;
  return versions;
end
$$;

revoke all on function public.apply_canvas_layout (uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.apply_canvas_layout (uuid, uuid, jsonb) to service_role;
