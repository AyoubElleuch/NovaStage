import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { sampleWorkflow } from "./test-fixtures";
import { prepareWorkflow } from "./workflow";
import { buildMcpGraph } from "./graph";

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
}, 30000);
beforeEach(async () => {
  await db.exec(`truncate public.projects, auth.users, public.project_members, public.project_banned_members cascade;
    insert into auth.users values ('${user}');
    insert into public.projects (id, created_by) values ('${project}', '${user}');
    insert into public.canvas_mcp_drafts (id, project_id, user_id, prompt, mode, status)
      values ('${draft}', '${project}', '${user}', 'Design an API', 'full_stack', 'ready');`);
});
afterAll(async () => { await db.close(); });
const graph = () => buildMcpGraph(prepareWorkflow(sampleWorkflow()).workflow, []);
const apply = (payload: unknown, draftId = draft, caller = user) => db.query("select public.apply_canvas_mcp_draft($1, $2, $3::jsonb)", [draftId, caller, JSON.stringify(payload)]);
const count = async (table: string) => Number((await db.query<{ count: number }>(`select count(*) from public.${table}`)).rows[0].count);

it("saves nested full-stack content and acceptance atomically and prevents duplicate acceptance", async () => {
  await apply(graph());
  expect(await count("canvas_nodes")).toBe(7);
  expect(await count("canvas_checkpoints")).toBe(8);
  expect(await count("canvas_edges")).toBe(4);
  expect((await db.query<{ status: string }>("select status from public.canvas_mcp_drafts")).rows[0].status).toBe("applied");
  await expect(apply(graph())).rejects.toThrow("no longer ready");
  expect(await count("canvas_nodes")).toBe(7);
});
it("rolls back every node and task if an edge write fails; the draft can be retried safely", async () => {
  const invalid = graph();
  invalid.edges[0].target_node_id = randomUUID();
  await expect(apply(invalid)).rejects.toThrow();
  expect(await count("canvas_nodes")).toBe(0);
  expect(await count("canvas_checkpoints")).toBe(0);
  expect((await db.query<{ status: string }>("select status from public.canvas_mcp_drafts")).rows[0].status).toBe("ready");
  await apply(graph());
  expect(await count("canvas_nodes")).toBe(7);
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
  await db.query("insert into public.canvas_mcp_drafts (id,project_id,user_id,prompt,mode,status) values ($1,$2,$3,'Second diagram','full_stack','ready')", [second, project, user]);
  const before = (await db.query<{ right: number }>("select max(position_x + width) as right from public.canvas_nodes")).rows[0].right;
  await apply(stale, second);
  const added = (await db.query<{ position_x: number; sort_order: number }>("select position_x,sort_order from public.canvas_nodes where id = any($1::uuid[])", [stale.nodes.map(node => node.id)])).rows;
  expect(Math.min(...added.map(node => node.position_x))).toBeGreaterThan(before);
  expect(Math.min(...added.map(node => node.sort_order))).toBe(7);
});
it("denies browser roles access to credentials, drafts, and the privileged write function", async () => {
  await db.exec("set role authenticated");
  try {
    await expect(db.query("select * from public.canvas_mcp_connections")).rejects.toThrow("permission denied");
    await expect(db.query("select * from public.canvas_mcp_drafts")).rejects.toThrow("permission denied");
    await expect(apply(graph())).rejects.toThrow("permission denied");
  } finally { await db.exec("reset role"); }
});
