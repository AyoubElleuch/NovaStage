"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lock, Plus, Trash2, Unlock, X } from "lucide-react";
import { CanvasNode, CanvasEdge, NodeStatus } from "@/lib/canvas/types";
import { AwsIcon, getAWSService } from "./aws-icons";
import { calculateCompletionPercentage, isNodeFullyComplete } from "@/lib/canvas/coordinate-math";

interface CanvasDrawerProps {
  node: CanvasNode | null;
  allNodes: CanvasNode[];
  edges: CanvasEdge[];
  currentUserId: string;
  isProjectOwner: boolean;
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<CanvasNode>) => void | Promise<void>;
  onDeleteNode: (nodeId: string) => void;
  onToggleCheckpoint: (checkpointId: string, nodeId: string, nextCompleted: boolean) => void;
  onAddCheckpoint: (nodeId: string, title: string) => void;
  onDeleteCheckpoint: (checkpointId: string, nodeId: string) => void;
  onClaimNode: (nodeId: string) => void;
  onReleaseNode: (nodeId: string) => void;
  onRequestClaim: (node: CanvasNode) => void;
  onForceUnlock?: (nodeId: string) => void;
  onJumpToNode: (nodeId: string) => void;
}

const GROUP_STYLES = [
  ["vpc", "Virtual Private Cloud (VPC)"], ["subnet", "Subnet"],
  ["region", "AWS Region"], ["availability_zone", "Availability Zone"], ["custom", "Custom group"],
] as const;
const FIELD = "w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 dark:border-[#283548] dark:bg-[#121721] dark:text-white dark:disabled:bg-[#161d27]";
const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400";
const BUTTON = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-[#283548] dark:text-neutral-300 dark:hover:bg-[#1e2634]";

// Reconcile remote changes without replacing another field's unsaved draft.
function useDraft<T>(value: T) {
  const serialized = JSON.stringify(value);
  const [source, setSource] = useState(serialized);
  const [draft, setDraft] = useState(value);
  if (source !== serialized) {
    setSource(serialized);
    if (JSON.stringify(draft) === source) setDraft(value);
  }
  return [draft, setDraft] as const;
}

function NodeDrawer({ node, allNodes, edges, currentUserId, isProjectOwner, onClose, onUpdateNode,
  onDeleteNode, onToggleCheckpoint, onAddCheckpoint, onDeleteCheckpoint, onClaimNode, onReleaseNode,
  onRequestClaim, onForceUnlock, onJumpToNode,
}: Omit<CanvasDrawerProps, "node"> & { node: CanvasNode }) {
  const id = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const pendingSaveRef = useRef(new Map<string, Promise<void>>());
  const [isReleasing, setIsReleasing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [title, setTitle] = useDraft(node.title);
  const [description, setDescription] = useDraft(node.description || "");
  const [region, setRegion] = useDraft(node.aws_metadata?.region || "");
  const [config, setConfig] = useDraft<Record<string, string>>(node.aws_metadata?.config || {});
  const [annotation, setAnnotation] = useDraft(node.annotation_metadata?.content || "");
  const [newCheckpoint, setNewCheckpoint] = useState("");
  const [newConfigKey, setNewConfigKey] = useState("");
  const [newConfigValue, setNewConfigValue] = useState("");
  const [configError, setConfigError] = useState("");
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const isMilestone = !node.node_type || node.node_type === "milestone";
  const isAws = node.node_type === "aws_service";
  const isGroup = node.node_type === "group";
  const isAnnotation = node.node_type === "annotation";
  const kind = isAws ? "AWS resource" : isGroup ? "Group" : isAnnotation ? "Note" : "Milestone";
  const editable = node.claimed_by === currentUserId;
  const claimedByOther = Boolean(node.claimed_by && !editable);
  const holderName = node.claim_holder?.fullName && node.claim_holder.fullName !== "You" ? node.claim_holder.fullName : "a collaborator";
  const completion = calculateCompletionPercentage(node.checkpoints);
  const completedCount = node.checkpoints.filter((checkpoint) => checkpoint.is_completed).length;
  const complete = isNodeFullyComplete(node);
  const service = getAWSService(node.aws_metadata?.serviceId || "");
  const incoming = [...new Set(edges.filter((edge) => edge.target_node_id === node.id).map((edge) => edge.source_node_id))];
  const outgoing = [...new Set(edges.filter((edge) => edge.source_node_id === node.id).map((edge) => edge.target_node_id))];

  const close = () => {
    const active = document.activeElement;
    if ((active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) && drawerRef.current?.contains(active)) active.blur();
    onClose();
  };

  const persist = (updates: Partial<CanvasNode>) => {
    setSaveError("");
    const request = Promise.resolve(onUpdateNode(node.id, updates));
    pendingSaveRef.current.set(Object.keys(updates).sort().join(","), request);
    void request.catch(() => setSaveError("This change could not be saved. Keep edit access and try again."));
  };

  const release = async () => {
    setIsReleasing(true);
    try { await Promise.all(pendingSaveRef.current.values()); onReleaseNode(node.id); }
    catch { setSaveError("Save your changes before releasing edit access."); }
    finally { setIsReleasing(false); }
  };

  const saveTitle = () => {
    if (!editable) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Add a title so this node is easy to find.");
      setTitle(node.title);
      return;
    }
    setTitleError("");
    setTitle(trimmed);
    if (trimmed !== node.title) persist({ title: trimmed, ...(isGroup ? { group_metadata: { label: trimmed, style: node.group_metadata?.style || "custom", childNodeIds: node.group_metadata?.childNodeIds || [] } } : {}) });
  };
  const saveDescription = () => {
    if (editable && description !== (node.description || "")) persist({ description });
  };
  const saveMetadata = (nextConfig = config) => {
    if (!editable || !isAws) return;
    const nextRegion = region.trim();
    if (nextRegion === (node.aws_metadata?.region || "") && JSON.stringify(nextConfig) === JSON.stringify(node.aws_metadata?.config || {})) return;
    persist({ aws_metadata: {
      ...node.aws_metadata, serviceId: node.aws_metadata?.serviceId || "", category: node.aws_metadata?.category || "compute",
      region: nextRegion || undefined, config: nextConfig,
    } });
  };

  const renderConnections = (nodeIds: string[], direction: "incoming" | "outgoing") => {
    const connectedNodes = nodeIds.map((nodeId) => allNodes.find((item) => item.id === nodeId)).filter((item): item is CanvasNode => Boolean(item));
    return <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        {direction === "incoming" ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
        {isMilestone ? direction === "incoming" ? "Prerequisites" : "Next milestones" : direction === "incoming" ? "Incoming connections" : "Outgoing connections"} <span className="text-neutral-400">({connectedNodes.length})</span>
      </p>
      {connectedNodes.length ? <div className="space-y-2">{connectedNodes.map((connected) => <button key={connected.id} type="button" onClick={() => onJumpToNode(connected.id)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left text-xs hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-[#283548] dark:bg-[#121721] dark:hover:bg-[#1e2634]">
        <span className="min-w-0 truncate font-medium text-neutral-800 dark:text-neutral-200">{connected.title}</span>
        <span className={`shrink-0 text-[10px] font-semibold ${isNodeFullyComplete(connected) ? "text-emerald-600 dark:text-emerald-400" : connected.status === "blocked" ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>{isNodeFullyComplete(connected) ? connected.node_type === "aws_service" ? "Ready" : "Complete" : connected.status === "blocked" ? "Blocked" : "Pending"}</span>
      </button>)}</div> : <p className="text-xs text-neutral-500 dark:text-neutral-400">{direction === "incoming" ? "No incoming connections." : "No outgoing connections."}</p>}
    </div>;
  };

  return <>
    <div className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-xs md:hidden" onClick={close} aria-hidden="true" />
    <aside ref={drawerRef} data-canvas-ui="true" aria-label={`${kind} details`}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); close(); }
      }}
      className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-[#283548] dark:bg-[#161d27]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-[#283548]">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{kind} details</p><h2 className="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-white" title={node.title}>{node.title}</h2></div>
        <button ref={closeRef} type="button" onClick={close} aria-label="Close details" title="Close details (Esc)" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-[#1e2634]"><X className="h-4 w-4" /></button>
      </div>

      <div className={`shrink-0 border-b px-5 py-3 ${claimedByOther ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" : "border-neutral-100 bg-neutral-50 dark:border-[#283548] dark:bg-[#121721]/60"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">{claimedByOther ? <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" /> : <Unlock className="h-3.5 w-3.5 shrink-0" />}<span>{editable ? "You have edit access" : claimedByOther ? `Editing: ${holderName}` : "Claim this node to make changes"}</span></p>
          {editable ? <button type="button" disabled={isReleasing} onClick={() => void release()} className={`${BUTTON} disabled:opacity-50`}>{isReleasing ? "Saving…" : "Release"}</button> : claimedByOther ? <button type="button" onClick={() => onRequestClaim(node)} className={BUTTON}>Request access</button> : <button type="button" onClick={() => onClaimNode(node.id)} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-600">Claim to edit</button>}
        </div>
        {claimedByOther && isProjectOwner && onForceUnlock && <button type="button" onClick={() => onForceUnlock(node.id)} className="mt-2 text-[11px] font-semibold text-amber-800 underline underline-offset-2 dark:text-amber-400">Release collaborator&apos;s lock as owner</button>}
        {saveError && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{saveError}</p>}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        <div>
          <label htmlFor={`${id}-title`} className={LABEL}>{isAws ? "Resource label" : isGroup ? "Group name" : isAnnotation ? "Note title" : "Milestone title"}</label>
          <input id={`${id}-title`} value={title} disabled={!editable} maxLength={200} onChange={(event) => { setTitle(event.target.value); setTitleError(""); }} onBlur={saveTitle}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); saveTitle(); } if (event.key === "Escape") { event.preventDefault(); setTitle(node.title); setTitleError(""); } }}
            aria-invalid={Boolean(titleError)} aria-describedby={titleError ? `${id}-title-error` : undefined} className={`${FIELD} font-semibold`} />
          {titleError && <p id={`${id}-title-error`} className="mt-1 text-xs text-red-600" role="alert">{titleError}</p>}
          <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">Changes save when you leave a field. Press Enter to save the title.</p>
        </div>

        {!isAnnotation && <div>
          <label htmlFor={`${id}-status`} className={LABEL}>{isAws ? "Resource status" : "Status"}</label>
          <select id={`${id}-status`} value={isMilestone && complete ? "completed" : node.status} disabled={!editable || (isMilestone && node.checkpoints.length > 0 && complete)}
            onChange={(event) => persist({ status: event.target.value as NodeStatus })} className={FIELD}>
            <option value="draft">Planned</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed" disabled={isMilestone && node.checkpoints.length > 0 && !complete}>{isAws ? "Ready" : "Complete"}</option>
          </select>
          {isMilestone && node.checkpoints.length > 0 && <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">Completion follows the checklist below.</p>}
        </div>}

        {isMilestone && <section aria-label="Milestone checkpoints">
          <div className="mb-3 flex items-center justify-between gap-2"><h3 className={`${LABEL} mb-0`}>Checkpoints</h3><span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{completedCount}/{node.checkpoints.length}{node.checkpoints.length > 0 && ` · ${completion}%`}</span></div>
          {node.checkpoints.length > 0 && <div role="progressbar" aria-label="Milestone completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} className="mb-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1e2634]"><div className="h-full rounded-full bg-emerald-500 transition-[width] motion-reduce:transition-none" style={{ width: `${completion}%` }} /></div>}
          {!node.checkpoints.length && <p className="mb-3 rounded-lg border border-dashed border-neutral-200 p-3 text-xs leading-relaxed text-neutral-500 dark:border-[#283548] dark:text-neutral-400">Break this milestone into clear steps to track progress.{!editable && " Claim edit access to add your first checkpoint."}</p>}
          <div className="space-y-2">{node.checkpoints.map((checkpoint) => <div key={checkpoint.id} className={`flex items-start gap-2 rounded-lg border p-2.5 ${checkpoint.is_completed ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-neutral-200 dark:border-[#283548]"}`}>
            <button type="button" aria-pressed={checkpoint.is_completed} aria-label={editable ? `Mark "${checkpoint.title}" as ${checkpoint.is_completed ? "incomplete" : "complete"}` : `Get edit access for "${checkpoint.title}"`}
              onClick={() => editable ? onToggleCheckpoint(checkpoint.id, node.id, !checkpoint.is_completed) : claimedByOther ? onRequestClaim(node) : onClaimNode(node.id)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {checkpoint.is_completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Circle className="h-4 w-4 text-neutral-400" />}
            </button>
            <p className={`min-w-0 flex-1 self-center break-words text-xs leading-relaxed ${checkpoint.is_completed ? "text-neutral-500 line-through" : "text-neutral-800 dark:text-neutral-200"}`}>{checkpoint.title}</p>
            {editable && <button type="button" aria-label={`Delete checkpoint "${checkpoint.title}"`} title="Delete checkpoint" onClick={() => onDeleteCheckpoint(checkpoint.id, node.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>)}</div>
          {editable && <form className="mt-3 flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (newCheckpoint.trim()) { onAddCheckpoint(node.id, newCheckpoint.trim()); setNewCheckpoint(""); } }}>
            <input aria-label="New checkpoint" placeholder="Add a checkpoint…" maxLength={500} value={newCheckpoint} onChange={(event) => setNewCheckpoint(event.target.value)} className={`${FIELD} flex-1 text-xs`} />
            <button type="submit" aria-label="Add checkpoint" disabled={!newCheckpoint.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-900 text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-600"><Plus className="h-4 w-4" /></button>
          </form>}
        </section>}

        {isAws && <section aria-label="AWS resource configuration" className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-[#283548] dark:bg-[#121721]"><AwsIcon serviceId={node.aws_metadata?.serviceId || ""} size={36} /><div className="min-w-0"><p className="text-xs font-semibold text-neutral-900 dark:text-white">{service?.name || node.aws_metadata?.serviceId || "AWS service"}</p><p className="mt-1 text-[11px] capitalize text-neutral-500 dark:text-neutral-400">{(service?.category || node.aws_metadata?.category || "").replaceAll("-", " ").replaceAll("_", " ")}</p></div></div>
          <div><label htmlFor={`${id}-region`} className={LABEL}>AWS Region</label><input id={`${id}-region`} value={region} disabled={!editable} onChange={(event) => setRegion(event.target.value)} onBlur={() => saveMetadata()} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); saveMetadata(); } }} placeholder="Unspecified · e.g. eu-west-1" className={FIELD} /><p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">Leave blank for a global service or an undecided region.</p></div>
          <div><h3 className={LABEL}>Resource configuration</h3>
            <div className="space-y-2">{Object.entries(config).map(([key, value]) => <div key={key} className="flex items-center gap-2">
              <label htmlFor={`${id}-config-${key}`} className="w-1/3 shrink-0 break-words text-xs font-medium text-neutral-600 dark:text-neutral-400">{key}</label>
              <input id={`${id}-config-${key}`} value={value} disabled={!editable} onChange={(event) => setConfig((previous) => ({ ...previous, [key]: event.target.value }))} onBlur={() => saveMetadata()} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); saveMetadata(); } }} className={`${FIELD} flex-1 px-2 py-2 font-mono text-xs`} />
              {editable && <button type="button" aria-label={`Remove configuration ${key}`} onClick={() => { const next = { ...config }; delete next[key]; setConfig(next); saveMetadata(next); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>)}</div>
            {!Object.keys(config).length && <p className="text-xs text-neutral-500 dark:text-neutral-400">No properties added yet.</p>}
            {editable && <form className="mt-3 space-y-2 rounded-lg border border-dashed border-neutral-200 p-3 dark:border-[#283548]" onSubmit={(event) => {
              event.preventDefault(); const key = newConfigKey.trim(); if (!key) return;
              if (Object.hasOwn(config, key)) { setConfigError("This key already exists. Edit its value above."); return; }
              const next = { ...config, [key]: newConfigValue }; setConfig(next); saveMetadata(next); setNewConfigKey(""); setNewConfigValue(""); setConfigError("");
            }}>
              <div className="flex gap-2"><input aria-label="Configuration key" value={newConfigKey} onChange={(event) => { setNewConfigKey(event.target.value); setConfigError(""); }} placeholder="Key" className={`${FIELD} flex-1 px-2 py-2 text-xs`} /><input aria-label="Configuration value" value={newConfigValue} onChange={(event) => setNewConfigValue(event.target.value)} placeholder="Value" className={`${FIELD} flex-1 px-2 py-2 text-xs`} /></div>
              {configError && <p role="alert" className="text-xs text-red-600">{configError}</p>}
              <button type="submit" disabled={!newConfigKey.trim()} className={`${BUTTON} w-full disabled:opacity-40`}><Plus className="h-3.5 w-3.5" />Add property</button>
            </form>}
          </div>
        </section>}

        {isGroup && <div><label htmlFor={`${id}-style`} className={LABEL}>Boundary style</label><select id={`${id}-style`} disabled={!editable} value={node.group_metadata?.style || "custom"} onChange={(event) => persist({ group_metadata: { label: node.group_metadata?.label || node.title, style: event.target.value as NonNullable<CanvasNode["group_metadata"]>["style"], childNodeIds: node.group_metadata?.childNodeIds || [] } })} className={FIELD}>{GROUP_STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{node.group_metadata?.childNodeIds?.length || 0} resources in this group</p></div>}

        {isAnnotation && <div><label htmlFor={`${id}-note`} className={LABEL}>Note content</label><textarea id={`${id}-note`} rows={6} disabled={!editable} value={annotation} onChange={(event) => setAnnotation(event.target.value)} onBlur={() => { if (editable && annotation !== (node.annotation_metadata?.content || "")) persist({ annotation_metadata: { ...node.annotation_metadata, content: annotation } }); }} className={`${FIELD} resize-y leading-relaxed`} /></div>}

        <div><label htmlFor={`${id}-description`} className={LABEL}>Description & notes</label><textarea id={`${id}-description`} rows={4} disabled={!editable} value={description} onChange={(event) => setDescription(event.target.value)} onBlur={saveDescription} placeholder="Add context, requirements, links, or decisions…" className={`${FIELD} resize-y text-xs leading-relaxed`} /></div>

        {!isAnnotation && <section aria-label="Connected nodes" className="space-y-4 border-t border-neutral-100 pt-5 dark:border-[#283548]"><h3 className={LABEL}>{isMilestone ? "Dependency flow" : "Architecture connections"}</h3>{renderConnections(incoming, "incoming")}{renderConnections(outgoing, "outgoing")}</section>}
      </div>

      {(editable || isProjectOwner) && <div className="shrink-0 border-t border-neutral-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-[#283548]"><button type="button" onClick={() => onDeleteNode(node.id)} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" />Delete {kind.toLowerCase()}</button></div>}
    </aside>
  </>;
}

export default function CanvasDrawer(props: CanvasDrawerProps) {
  return props.node ? <NodeDrawer key={props.node.id} {...props} node={props.node} /> : null;
}
