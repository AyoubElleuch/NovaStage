-- Run only in a fresh, isolated PostgreSQL test cluster. Creates fixture roles and tables.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role bypassrls;
create table public.projects (id uuid primary key);
\ir ../../supabase/migrations/022_canvas_sharing.sql
insert into public.projects values ('00000000-0000-0000-0000-000000000001');
set role service_role;
insert into public.canvas_shares(project_id, token) values ('00000000-0000-0000-0000-000000000001', repeat('a',64));
do $$ begin
  if (select count(*) from public.canvas_shares) <> 1 then raise exception 'service read failed'; end if;
end $$;
reset role;
do $$ begin
  if not (select relrowsecurity from pg_class where oid='public.canvas_shares'::regclass) then raise exception 'RLS missing'; end if;
  if has_table_privilege('anon','public.canvas_shares','SELECT,INSERT,UPDATE,DELETE') then raise exception 'anon has access'; end if;
  if has_table_privilege('authenticated','public.canvas_shares','SELECT,INSERT,UPDATE,DELETE') then raise exception 'authenticated has access'; end if;
  begin
    insert into public.canvas_shares(project_id,token) values ('00000000-0000-0000-0000-000000000001','bad-token');
    raise exception 'invalid token accepted';
  exception when check_violation then null; end;
end $$;
set role anon;
do $$ begin
  begin perform * from public.canvas_shares; raise exception 'anon read succeeded';
  exception when insufficient_privilege then null; end;
  begin delete from public.canvas_shares; raise exception 'anon write succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin perform * from public.canvas_shares; raise exception 'member read succeeded';
  exception when insufficient_privilege then null; end;
  begin update public.canvas_shares set token=repeat('b',64); raise exception 'member write succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from public.projects where id='00000000-0000-0000-0000-000000000001';
do $$ begin
  if exists(select 1 from public.canvas_shares) then raise exception 'cascade failed'; end if;
end $$;
select 'PASS: migration, token constraints, service access, RLS, denied public/member access, project cascade' as result;
