"use client";

import { useEffect, useRef, useState } from "react";
import type { AIPreview } from "@/lib/ai/response";
import type { CanvasNode } from "@/lib/canvas/types";
import GeneratedDiagramPreview from "./generated-diagram-preview";

export default function CanvasAIReview({
  preview,
  existingNodes,
  onApply,
  onDismiss,
}: {
  preview: AIPreview;
  existingNodes: CanvasNode[];
  onApply: () => Promise<void>;
  onDismiss: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const existing = new Map(existingNodes.map((node) => [node.id, node]));
  return (
    <dialog
      ref={dialog}
      data-canvas-ui
      aria-labelledby="ai-review-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) void act(onDismiss);
      }}
      className="m-auto max-h-[90dvh] w-[min(640px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-2xl backdrop:bg-neutral-950/50 dark:border-[#283548] dark:bg-[#161d27] dark:text-white"
    >
      <h2 id="ai-review-title" className="text-lg font-semibold">
        Review AI changes
      </h2>
      <p className="my-2 text-sm text-neutral-500 dark:text-neutral-300">
        {preview.summary || "Inspect the proposed diagram before applying it."}
      </p>
      <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        Nothing has been applied. Preview expires at{" "}
        {new Date(preview.expiresAt).toLocaleTimeString()}. Generation uses one request; applying it
        uses no additional requests.
      </p>
      <GeneratedDiagramPreview graph={preview} />
      <details className="my-4 text-xs" open={preview.deletedIds.length > 0}>
        <summary className="cursor-pointer font-semibold">
          {preview.nodes.filter((node) => !existing.has(node.id)).length} added ·{" "}
          {preview.nodes.filter((node) => existing.has(node.id)).length} updated ·{" "}
          {preview.deletedIds.length} removed
        </summary>
        <ul className="mt-2 space-y-2">
          {preview.deletedIds.map((id) => (
            <li key={id} className="text-red-600 dark:text-red-400">
              Remove: {existing.get(id)?.title || id}
            </li>
          ))}
          {preview.nodes.map((node) => (
            <li key={node.id}>
              <details>
                <summary className="cursor-pointer">
                  {existing.has(node.id) ? "Update" : "Add"}: {node.title}
                </summary>
                {existing.has(node.id) && (
                  <p className="mt-1">
                    Previously: {existing.get(node.id)?.title} —{" "}
                    {existing.get(node.id)?.description}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap break-words">{node.description}</p>
                {node.checkpoints.map((cp) => (
                  <p key={cp.id}>• {cp.title}</p>
                ))}
                {node.aws_metadata && (
                  <pre className="mt-1 whitespace-pre-wrap break-words">
                    {JSON.stringify(node.aws_metadata, null, 2)}
                  </pre>
                )}
              </details>
            </li>
          ))}
        </ul>
      </details>
      {error && (
        <p role="alert" className="my-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 flex justify-end gap-3 bg-white pt-3 dark:bg-[#161d27]">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(onDismiss)}
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm disabled:opacity-50 dark:border-[#283548]"
        >
          Discard preview
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(onApply)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Apply changes"}
        </button>
      </div>
    </dialog>
  );
}
