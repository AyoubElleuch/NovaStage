"use client";

import { useState } from "react";
import type { CanvasEdge, EdgeType } from "@/lib/canvas/types";

export type ConnectionUpdate = { label: string; edge_type: EdgeType };

export default function ConnectionEditor({ edge, onSave, onClose }: {
  edge: CanvasEdge;
  onSave: (edgeId: string, updates: ConnectionUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(edge.label || "");
  const [type, setType] = useState<EdgeType>(edge.edge_type || "data_flow");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <form aria-label="Edit architecture connection"
      className="rounded-xl border border-neutral-300 bg-white p-3 text-xs text-neutral-900 shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:text-white"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape" && !saving) onClose(); }}
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true); setError("");
        try { await onSave(edge.id, { label: label.trim(), edge_type: type }); onClose(); }
        catch (error) { setError(error instanceof Error ? error.message : "Unable to save connection"); }
        finally { setSaving(false); }
      }}>
      <label className="block font-semibold">Connection label
        <input autoFocus maxLength={120} value={label} disabled={saving}
          onChange={(event) => setLabel(event.target.value)} placeholder="e.g. HTTPS · 443 / Read objects"
          className="mt-1 mb-2 w-full rounded border border-neutral-300 bg-transparent p-2" />
      </label>
      <label className="block font-semibold">Connection type
        <select aria-label="Connection type" value={type} disabled={saving} onChange={(event) => setType(event.target.value as EdgeType)}
          className="mt-1 mb-2 w-full rounded border border-neutral-300 bg-white p-2 text-neutral-900">
          <option value="data_flow">Data flow</option><option value="network">Network</option>
          <option value="event">Event</option><option value="dependency">Dependency</option>
        </select>
      </label>
      {error && <p role="alert" className="mb-2 text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="rounded px-3 py-2">Cancel</button>
        <button disabled={saving} className="rounded bg-blue-600 px-3 py-2 text-white">{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
