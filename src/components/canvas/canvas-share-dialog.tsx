"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Loader2, X } from "lucide-react";

export default function CanvasShareDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const endpoint = `/api/dashboard/projects/${encodeURIComponent(slug)}/canvas/share`;
  const url = token ? `${origin}/share/${token}` : "";

  useEffect(() => {
    ref.current?.showModal();
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal, cache: "no-store" })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setOrigin(window.location.origin); setToken(data.token); })
      .catch(err => { if (err.name !== "AbortError") setError("Could not load sharing settings. Close and try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  const update = async (method: "POST" | "DELETE") => {
    setLoading(true); setError(""); setCopied(false);
    try {
      const res = await fetch(endpoint, { method });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
    } catch { setError("Could not update sharing. Please try again."); }
    finally { setLoading(false); }
  };

  return <dialog ref={ref} aria-labelledby="canvas-share-title" onCancel={onClose} onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="canvas-native-dialog pointer-events-auto m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-2xl backdrop:bg-neutral-950/50 dark:border-[#283548] dark:bg-[#161d27] dark:text-white">
    <div className="flex items-center justify-between gap-3"><h2 id="canvas-share-title" className="text-lg font-semibold">Share canvas</h2>
      <button type="button" autoFocus onClick={onClose} aria-label="Close sharing" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1e2634]"><X className="h-5 w-5" /></button></div>
    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">Anyone with the link can explore the canvas and open details. They cannot edit it or see the project name or members. Canvas content, including notes and resource configuration, will be visible.</p>
    {loading && <p role="status" className="mt-5 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Loading sharing settings…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {token ? <div className="mt-5 space-y-3">
      <label className="block text-xs font-semibold" htmlFor="canvas-share-url">View-only link</label>
      <input id="canvas-share-url" readOnly value={url} onFocus={event => event.currentTarget.select()} className="w-full rounded-lg border border-neutral-300 p-3 text-base dark:border-[#384961]" />
      <button type="button" disabled={loading} onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setError(""); }
        catch { setError("Copy the link from the field above."); }
      }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Link copied" : "Copy link"}</button>
      <button type="button" disabled={loading} onClick={() => void update("DELETE")} className="min-h-11 w-full rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400">Disable link</button>
      <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">Disabling stops new visits. Enabling again creates a new link. People may keep content they have already viewed.</p>
    </div> : <button type="button" disabled={loading} onClick={() => void update("POST")} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Link2 className="h-4 w-4" />Enable view-only link</button>}
  </dialog>;
}
