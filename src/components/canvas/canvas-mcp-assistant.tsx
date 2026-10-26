"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Copy, Link2, Loader2, ShieldCheck } from "lucide-react";
import type { AIGenerationMode } from "@/lib/ai/types";
import type { z } from "zod";
import type { workflowSchema } from "@/lib/mcp/workflow";
import { mcpSetup } from "@/lib/mcp/setup";

type Workflow = z.infer<typeof workflowSchema>;
type Draft = { id: string; prompt: string; mode: string; status: string; workflow: Workflow | null; validation: Record<string, number | boolean> | null };
type State = { connection: { expires_at: string; last_used_at: string | null } | null; drafts: Draft[] };
const BUTTON = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold transition hover:bg-neutral-100 disabled:opacity-50 dark:border-[#384961] dark:hover:bg-[#283548]";
const FIELD = "w-full rounded-lg border border-neutral-200 bg-transparent p-2.5 text-xs dark:border-[#384961]";

async function readState(url: string): Promise<State> {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load your connection.");
  return { ...data, connection: data.connection && Date.parse(data.connection.expires_at) > Date.now() ? data.connection : null };
}

export default function CanvasMcpAssistant({ projectId, projectSlug, onApplied }: {
  projectId: string; projectSlug: string; onApplied?: () => Promise<void> | void;
}) {
  const endpoint = `/api/dashboard/projects/${encodeURIComponent(projectSlug)}/canvas/mcp`;
  const { data, error: loadError, mutate, isLoading } = useSWR<State>(endpoint, readState, { refreshInterval: 5000, shouldRetryOnError: false });
  const [token, setToken] = useState<string | null>(null);
  const [shell, setShell] = useState<"powershell" | "bash">("powershell");
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AIGenerationMode>("full_stack");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const active = Boolean(data?.connection);
  const setup = token ? mcpSetup(projectId, window.location.origin, token, shell) : null;

  async function act(body: Record<string, unknown>, method = "POST") {
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to complete this action.");
      if (body.action === "connect") { setToken(result.token); setNotice("Connection created. Copy and run a setup command below."); }
      if (method === "DELETE") { setToken(null); setNotice("Connection revoked. The old credential can no longer access this canvas."); }
      if (body.action === "request") { setPrompt(""); setNotice("Request queued. Ask your connected assistant to read list_requests and generate your draft."); }
      if (body.action === "apply") { await onApplied?.(); setNotice("Diagram added to your canvas."); }
      await mutate();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`); setError(null); }
    catch { setError("Clipboard unavailable. Select and copy the text below."); }
  }

  return <section aria-label="Connect your AI" className="mt-3 space-y-3 text-neutral-800 dark:text-neutral-200">
    <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
      <div className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-emerald-600" />Your models. Your canvas.</div>
      <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-300">Generate workflows, AWS architecture, and full-stack diagrams with Codex or Claude Code. Uses your assistant account and its limits; no NovaStage AI credits.</p>
    </div>
    {(error || loadError) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{error || loadError?.message}</p>}
    {notice && <p role="status" className="text-xs leading-5 text-emerald-700 dark:text-emerald-400">{notice}</p>}
    {isLoading && <p className="flex gap-2 text-xs"><Loader2 className="h-4 w-4 animate-spin" />Loading connection…</p>}
    {data && <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">{active ? data.connection?.last_used_at ? "MCP client reached this canvas" : "Waiting for your MCP client" : "No active connection"}</p>
        {active && <button type="button" disabled={busy} className={BUTTON} onClick={() => act({}, "DELETE")}>Revoke</button>}
      </div>
      {!token && <button type="button" disabled={busy} className={`${BUTTON} w-full bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-emerald-700 dark:hover:bg-emerald-600`} onClick={() => act({ action: "connect" })}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}{active ? "Replace connection & get setup" : "Create canvas connection"}
      </button>}
      {setup && <div className="space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-[#384961]">
        <label className="flex items-center justify-between gap-2 text-xs">Your terminal<select aria-label="Setup terminal" value={shell} onChange={event => setShell(event.target.value as typeof shell)} className="rounded border border-neutral-200 bg-white p-1 dark:border-[#384961] dark:bg-[#161d27]"><option value="powershell">PowerShell</option><option value="bash">macOS / Linux (Bash)</option></select></label>
        {(["codex", "claude"] as const).map(client => <div key={client} className="space-y-1">
          <button type="button" onClick={() => copy(setup[client], client === "codex" ? "Codex setup" : "Claude Code setup")} className={`${BUTTON} w-full`}><Copy className="h-3.5 w-3.5" />Copy {client === "codex" ? "Codex" : "Claude Code"} setup</button>
          <details><summary className="cursor-pointer text-[11px] text-neutral-500 dark:text-neutral-400">View command</summary><pre className="mt-1 max-h-28 overflow-auto rounded bg-neutral-100 p-2 text-[10px] dark:bg-[#10151f]">{setup[client]}</pre></details>
        </div>)}
        <p className="text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">Run one command in your terminal. For Codex, launch it from that same terminal so it inherits the token. Restart your assistant if needed. The credential is shown only now, expires after 30 days, and grants read and draft access to this canvas. Keep copied commands private. Replacing it revokes the previous credential.</p>
        <button type="button" className={BUTTON} onClick={() => setToken(null)}>Hide setup credential</button>
      </div>}
      {active && <>
        <p className="flex items-start gap-2 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Only this canvas is shared with your assistant. You review drafts before adding them. Existing work stays in place. Expires {new Date(data.connection!.expires_at).toLocaleDateString()}.</p>
        <form onSubmit={event => { event.preventDefault(); if (prompt.trim()) void act({ action: "request", prompt, mode }); }} className="space-y-2 border-t border-neutral-200 pt-3 dark:border-[#384961]">
          <label className="block text-xs font-semibold" htmlFor="mcp-mode">What would you like to build?</label>
          <select id="mcp-mode" className={`${FIELD} bg-white dark:bg-[#161d27]`} value={mode} onChange={event => setMode(event.target.value as AIGenerationMode)}><option value="workflow">Workflow</option><option value="aws_architecture">AWS architecture</option><option value="full_stack">Full stack</option></select>
          <textarea aria-label="Prompt for your AI" className={`${FIELD} min-h-20 resize-y`} maxLength={8000} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Describe the workflow or architecture you need…" />
          <button type="submit" disabled={busy || !prompt.trim()} className={BUTTON}>Queue for your assistant</button>
        </form>
        <p className="text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">After queuing, paste this into Codex or Claude Code. Your assistant must be running and prompted; requests do not start it automatically.</p>
        <button type="button" className={`${BUTTON} w-full`} onClick={() => copy(`Use the ${mcpSetup(projectId, window.location.origin, "", shell).name} MCP server. Read get_canvas and list_requests, generate the pending diagram using my selected model, search_aws_services for canonical AWS IDs, then call propose_workflow with the requestId. Tell me when the draft is ready to review in NovaStage.`, "Assistant prompt")}><Copy className="h-3.5 w-3.5" />Copy assistant prompt</button>
      </>}
      {!!data.drafts.length && <div className="space-y-2 border-t border-neutral-200 pt-3 dark:border-[#384961]">
        <h4 className="text-xs font-semibold">Your requests & drafts</h4>
        {data.drafts.map(draft => <article key={draft.id} className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-[#384961]">
          <p className="break-words text-xs font-semibold">{draft.workflow?.summary || draft.prompt}</p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{draft.status === "pending" ? "Queued · Waiting for your assistant" : draft.status === "ready" ? "Draft ready · Review before adding" : draft.status}</p>
          {draft.workflow && <details><summary className="cursor-pointer text-xs font-medium">Review diagram content · {draft.workflow.milestones.length} milestones · {draft.workflow.serviceNodes.length} services</summary>
            <div className="mt-2 max-h-64 space-y-2 overflow-auto text-xs leading-5">
              {draft.workflow.milestones.map(node => <div key={node.tempId}><p className="font-semibold">{node.title}</p><p className="whitespace-pre-wrap break-words">{node.description}</p><ul className="list-inside list-disc">{node.checkpoints.map((cp, index) => <li key={index}>{cp.title}</li>)}</ul></div>)}
              {draft.workflow.serviceNodes.map(node => <div key={node.tempId}><p className="font-semibold">{node.name} · {node.serviceId}</p><p className="break-words">{node.description}</p><p>{node.region}</p>{Object.entries(node.config || {}).map(([key, value]) => <p className="break-words" key={key}>{key}: {value}</p>)}</div>)}
              {draft.workflow.groups.map(group => <p key={group.tempId}>{group.label} ({group.style}) · {group.childTempIds.join(", ")}</p>)}
              {[...draft.workflow.edges, ...draft.workflow.dataFlowEdges].map((edge, index) => <p className="break-words" key={index}>{edge.fromId} → {edge.toId}{"label" in edge && edge.label ? ` · ${edge.label}` : ""}</p>)}
              <p className="text-neutral-500 dark:text-neutral-400">NovaStage validates dependencies and nesting and arranges the diagram when you add it.</p>
            </div>
          </details>}
          <div className="flex gap-2">{draft.status === "ready" && <button type="button" className={`${BUTTON} text-emerald-700 dark:text-emerald-400`} disabled={busy} onClick={() => act({ action: "apply", id: draft.id })}><Check className="h-3.5 w-3.5" />Add to canvas</button>}
            {draft.status !== "applying" && <button type="button" className={BUTTON} disabled={busy} onClick={() => act({ action: "dismiss", id: draft.id })}>Dismiss</button>}
          </div>
        </article>)}
      </div>}
    </>}
  </section>;
}
