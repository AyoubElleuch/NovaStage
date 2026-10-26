import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { sampleWorkflow, sampleArchitecture } from "./test-fixtures";
import { prepareWorkflow } from "./workflow";
import { buildMcpGraph } from "./graph";
import { buildAIGraph } from "../canvas/ai-graph";

const db = new PGlite();
const user = "10000000-0000-4000-8000-000000000001";
const project = "20000000-0000-4000-8000-000000000001";
const draft = "30000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.projects(id uuid primary key, created_by uuid, ai_generating_by uuid, ai_generating_at timestamptz);
    create table public.project_members(project_id uuid, user_id uuid);
    create table public.project_banned_members(id uuid, project_id uuid, user_id uuid);`);
  // Use the actual canvas tables and constraints, then apply production migrations.
  const canvas = readFileSync("supabase/migrations/009_canvas_collaboration.sql", "utf8");
  await db.exec(canvas.slice(0, canvas.indexOf("-- 4. Canvas Claim")));
  await db.exec(readFileSync("supabase/migrations/017_aws_node_types_and_infrastructure.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/021_expanded_canvas_edge_types.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/023_canvas_mcp.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/024_retire_combined_generation.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/025_enforce_mcp_diagram_modes.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/026_atomic_ai_canvas_graph.sql", "utf8"));
}, 30000);
beforeEach(async () => {
  await db.exec(`truncate public.projects, auth.users, public.project_members, public.project_banned_members cascade;
    insert into auth.users values ('${user}');
    insert into public.projects (id, created_by) values ('${project}', '${user}');
    insert into public.canvas_mcp_drafts (id, project_id, user_id, prompt, mode, status)
      values ('${draft}', '${project}', '${user}', 'Design an API', 'aws_architecture', 'ready');`);
});
afterAll(async () => { await db.close(); });
const graph = () => buildMcpGraph(prepareWorkflow(sampleArchitecture()).workflow, []);
const apply = (payload: unknown, draftId = draft, caller = user) => db.query("select public.apply_canvas_mcp_draft($1, $2, $3::jsonb)", [draftId, caller, JSON.stringify(payload)]);
const count = async (table: string) => Number((await db.query<{ count: number }>(`select count(*) from public.${table}`)).rows[0].count);

const applyAI = (graph: ReturnType<typeof buildAIGraph>, mode = graph.mode) => db.query("select public.apply_canvas_ai_graph($1,$2,$3,$4::jsonb)", [project,user,mode,JSON.stringify(graph)]);
it("commits built-in creation atomically and rejects mixed modes and foreign endpoints", async () => {
  await db.query("update public.projects set ai_generating_by=$1, ai_generating_at=now()", [user]);
  const graph = buildAIGraph({ ...sampleWorkflow(), intent: "create_pipeline" }, [], "workflow");
  await expect(applyAI(graph, "aws_architecture")).rejects.toThrow(/mode/);
  graph.edges[0].target_node_id = randomUUID();
  await expect(applyAI(graph)).rejects.toThrow("Foreign endpoint");
  expect(await count("canvas_nodes")).toBe(0);
  expect(await count("canvas_checkpoints")).toBe(0);
  const valid = buildAIGraph({ ...sampleWorkflow(), intent: "create_pipeline" }, [], "workflow");
  await applyAI(valid);
  expect(await count("canvas_nodes")).toBe(2);
  expect(await count("canvas_checkpoints")).toBe(8);
  await expect(applyAI(valid)).rejects.toThrow("append new resources");
  const bad = buildAIGraph({ ...sampleArchitecture(), intent: "create_pipeline" }, [], "aws_architecture");
  bad.nodes[0].checkpoints = valid.nodes[0].checkpoints;
  await expect(applyAI(bad)).rejects.toThrow("without tasks");
  expect(await count("canvas_nodes")).toBe(2);
});
it("preserves claims and completed work on updates, and rolls back stale writes", async () => {
  await db.query("update public.projects set ai_generating_by=$1, ai_generating_at=now()", [user]);
  const graph = buildAIGraph({ ...sampleWorkflow(), intent: "create_pipeline" }, [], "workflow");
  await applyAI(graph);
  await db.query("update public.canvas_nodes set claimed_by=$1 where id=$2", [user,graph.nodes[0].id]);
  await db.query("update public.canvas_checkpoints set is_completed=true where id=$1", [graph.nodes[0].checkpoints[0].id]);
  const update = { ...graph, update: true };
  await applyAI(update);
  expect((await db.query<{ claimed_by: string }>("select claimed_by from public.canvas_nodes where id=$1", [graph.nodes[0].id])).rows[0].claimed_by).toBe(user);
  expect((await db.query<{ is_completed: boolean }>("select is_completed from public.canvas_checkpoints where id=$1", [graph.nodes[0].checkpoints[0].id])).rows[0].is_completed).toBe(true);
  await expect(applyAI(update)).rejects.toThrow("Stale");
  expect(await count("canvas_nodes")).toBe(2);
});

it("saves nested AWS content and acceptance atomically and prevents duplicate acceptance", async () => {
  await apply(graph());
  expect(await count("canvas_nodes")).toBe(5);
  expect(await count("canvas_checkpoints")).toBe(0);
  expect(await count("canvas_edges")).toBe(2);
  expect((await db.query<{ status: string }>("select status from public.canvas_mcp_drafts")).rows[0].status).toBe("applied");
  await expect(apply(graph())).rejects.toThrow("no longer ready");
  expect(await count("canvas_nodes")).toBe(5);
});
it("rolls back every node and task if an edge write fails; the draft can be retried safely", async () => {
  await db.query("update public.canvas_mcp_drafts set mode='workflow' where id=$1", [draft]);
  const invalid = buildMcpGraph(prepareWorkflow(sampleWorkflow()).workflow, []);
  invalid.edges[0].target_node_id = randomUUID();
  await expect(apply(invalid)).rejects.toThrow();
  expect(await count("canvas_nodes")).toBe(0);
  expect(await count("canvas_checkpoints")).toBe(0);
  expect((await db.query<{ status: string }>("select status from public.canvas_mcp_drafts")).rows[0].status).toBe("ready");
  await apply(buildMcpGraph(prepareWorkflow(sampleWorkflow()).workflow, []));
  expect(await count("canvas_nodes")).toBe(2);
});
it("enforces the selected mode at the final database write, even if application checks are bypassed", async () => {
  const workflow = buildMcpGraph(prepareWorkflow(sampleWorkflow()).workflow, []);
  await expect(apply(workflow)).rejects.toThrow("mode does not match");
  await expect(apply({ ...workflow, mode: "aws_architecture" })).rejects.toThrow("without tasks");
  const architecture = graph();
  architecture.nodes[0].checkpoints = workflow.nodes[0].checkpoints;
  await expect(apply(architecture)).rejects.toThrow("without tasks");
  await db.query("update public.canvas_mcp_drafts set mode='workflow' where id=$1", [draft]);
  await expect(apply({ ...graph(), mode: "workflow" })).rejects.toThrow("milestones and dependency edges only");
  expect(await count("canvas_nodes")).toBe(0);
  expect(await count("canvas_checkpoints")).toBe(0);
  expect((await db.query<{ status: string }>("select status from public.canvas_mcp_drafts")).rows[0].status).toBe("ready");
});
it("rejects a foreign user, removed membership, banned membership, and an active AI generation", async () => {
  await expect(apply(graph(), draft, randomUUID())).rejects.toThrow("no longer ready");
  await db.query("update public.projects set created_by = null");
  await expect(apply(graph())).rejects.toThrow("access denied");
  await db.query("insert into public.project_members values ($1,$2)", [project, user]);
  await db.query("insert into public.project_banned_members values ($1,$2,$3)", [randomUUID(), project, user]);
  await expect(apply(graph())).rejects.toThrow("access denied");
  await db.exec("delete from public.project_banned_members");
  await db.query("update public.projects set ai_generating_by = $1, ai_generating_at = now()", [user]);
  await expect(apply(graph())).rejects.toThrow("busy");
  expect(await count("canvas_nodes")).toBe(0);
});
it("rebases a stale layout and milestone order alongside a previously accepted diagram", async () => {
  const stale = graph();
  await apply(graph());
  const second = randomUUID();
  await db.query("insert into public.canvas_mcp_drafts (id,project_id,user_id,prompt,mode,status) values ($1,$2,$3,'Second diagram','aws_architecture','ready')", [second, project, user]);
  const before = (await db.query<{ right: number }>("select max(position_x + width) as right from public.canvas_nodes")).rows[0].right;
  await apply(stale, second);
  const added = (await db.query<{ position_x: number; sort_order: number }>("select position_x,sort_order from public.canvas_nodes where id = any($1::uuid[])", [stale.nodes.map(node => node.id)])).rows;
  expect(Math.min(...added.map(node => node.position_x))).toBeGreaterThan(before);
  expect(Math.min(...added.map(node => node.sort_order))).toBe(5);
});
it("saves a workflow and its checkpoints as one diagram", async () => {
  await db.query("update public.canvas_mcp_drafts set mode='workflow' where id=$1", [draft]);
  await apply(buildMcpGraph(prepareWorkflow(sampleWorkflow()).workflow, []));
  expect(await count("canvas_nodes")).toBe(2);
  expect(await count("canvas_checkpoints")).toBe(8);
  expect(await count("canvas_edges")).toBe(1);
});
it("retires unsupported draft modes while preserving their payload and restricting new requests", async () => {
  await db.exec("alter table public.canvas_mcp_drafts drop constraint canvas_mcp_drafts_mode_check");
  const payload = { summary: "Saved historical proposal" };
  await db.query("update public.canvas_mcp_drafts set mode='retired', workflow=$1::jsonb where id=$2", [JSON.stringify(payload), draft]);
  const applied = randomUUID();
  await db.query("insert into public.canvas_mcp_drafts (id,project_id,user_id,prompt,mode,status,workflow) values ($1,$2,$3,'Historical diagram','retired','applied',$4::jsonb)", [applied, project, user, JSON.stringify(payload)]);
  await db.exec(readFileSync("supabase/migrations/024_retire_combined_generation.sql", "utf8"));
  const stored = (await db.query<{ status: string; mode: string; workflow: unknown }>("select status,mode,workflow from public.canvas_mcp_drafts where id=$1", [draft])).rows[0];
  expect(stored).toEqual({ status: "dismissed", mode: "workflow", workflow: payload });
  expect((await db.query<{ status: string; workflow: unknown }>("select status,workflow from public.canvas_mcp_drafts where id=$1", [applied])).rows[0]).toEqual({ status: "applied", workflow: payload });
  expect(await count("canvas_nodes")).toBe(0);
  await expect(db.query("update public.canvas_mcp_drafts set mode='retired' where id=$1", [draft])).rejects.toThrow();
});
it("denies browser roles access to credentials, drafts, and the privileged write function", async () => {
  await db.exec("set role authenticated");
  try {
    await expect(db.query("select * from public.canvas_mcp_connections")).rejects.toThrow("permission denied");
    await expect(db.query("select * from public.canvas_mcp_drafts")).rejects.toThrow("permission denied");
    await expect(apply(graph())).rejects.toThrow("permission denied");
  } finally { await db.exec("reset role"); }
});
