-- NovaStage: Enable Realtime replication publication for canvas tables
-- Ensures both Supabase Realtime broadcast channels and postgres_changes listeners receive canvas updates

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.canvas_nodes;
    alter publication supabase_realtime add table public.canvas_checkpoints;
    alter publication supabase_realtime add table public.canvas_edges;
    alter publication supabase_realtime add table public.canvas_claim_requests;
  end if;
exception
  when duplicate_object then null;
end $$;
