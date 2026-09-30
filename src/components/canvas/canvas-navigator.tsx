"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X, Map, Box, Flag, StickyNote } from "lucide-react";
import type { CanvasNode } from "@/lib/canvas/types";
import { getAWSService } from "./aws-icons";

interface Props {
  nodes: CanvasNode[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onJumpToNode: (id: string) => void;
}

export default function CanvasNavigator({ nodes, isOpen, onToggle, onClose, onJumpToNode }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const resultsId = useId();
  const results = useMemo(() => nodes.filter(node => {
    const type = node.node_type || "milestone";
    const service = node.aws_metadata && getAWSService(node.aws_metadata.serviceId);
    const haystack = [node.title, node.description, node.status.replaceAll("_", " "), type,
      service?.name, service?.shortName, service?.category, node.aws_metadata?.serviceId, node.aws_metadata?.region,
      ...Object.values(node.aws_metadata?.config || {}), node.group_metadata?.label,
      node.group_metadata?.style.replaceAll("_", " "), node.annotation_metadata?.content,
      ...node.checkpoints.map(checkpoint => checkpoint.title)].join(" ").toLowerCase();
    return (filter === "all" || type === filter) && query.toLowerCase().trim().split(/\s+/).every(term => haystack.includes(term));
  }), [nodes, query, filter]);
  const highlightedIndex = Math.min(activeIndex, Math.max(0, results.length - 1));
  const closeAndRestoreFocus = () => {
    onClose();
    triggerRef.current?.focus();
  };
  const jumpToNode = (id: string) => {
    onJumpToNode(id);
    closeAndRestoreFocus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.getElementById(`${resultsId}-${highlightedIndex}`)?.scrollIntoView?.({ block: "nearest" });
  }, [highlightedIndex, isOpen, resultsId]);

  return <div ref={containerRef} data-canvas-ui className="absolute left-3 top-[76px] z-30 flex max-h-[calc(100%_-_176px)] flex-col sm:left-5 sm:top-[88px]"
    onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); closeAndRestoreFocus(); } }}>
    <button ref={triggerRef} type="button" aria-label="Find on canvas" aria-expanded={isOpen} aria-controls={isOpen ? resultsId : undefined} onClick={onToggle}
      title="Find milestones and resources (Ctrl K)"
      className="flex h-10 shrink-0 items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white/95 px-3 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
      <Search className="h-4 w-4" /> <span>Find</span><kbd className="hidden rounded border border-neutral-200 px-1 text-[10px] text-neutral-400 lg:inline dark:border-slate-700">⌘ / Ctrl K</kbd>
    </button>
    {isOpen && <section aria-label="Canvas navigator" className="mt-2 flex min-h-0 w-[min(340px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 p-3 dark:border-slate-800">
        <Search className="h-4 w-4 shrink-0 text-neutral-400" />
        <input autoFocus role="combobox" aria-label="Search canvas" aria-autocomplete="list" aria-expanded={true}
          aria-controls={resultsId} aria-activedescendant={results.length ? `${resultsId}-${highlightedIndex}` : undefined}
          placeholder="Title, service, region or task…" value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={event => {
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length) {
              event.preventDefault();
              setActiveIndex((highlightedIndex + (event.key === "ArrowDown" ? 1 : results.length - 1)) % results.length);
            } else if (event.key === "Enter" && results[highlightedIndex]) {
              event.preventDefault();
              jumpToNode(results[highlightedIndex].id);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none dark:text-white" />
        <button type="button" onClick={closeAndRestoreFocus} aria-label="Close canvas search" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1 p-2" aria-label="Filter canvas items">
        {[["all", "All"], ["milestone", "Milestones"], ["aws_service", "AWS"], ["group", "Groups"], ["annotation", "Notes"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setActiveIndex(0); }}
          className={`rounded-lg px-2 py-1.5 text-xs ${filter === value ? "bg-emerald-600 text-white" : "text-neutral-500 hover:bg-neutral-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>{label}</button>)}
      </div>
      <p role="status" aria-live="polite" className="shrink-0 px-3 pb-2 text-[11px] text-neutral-500 dark:text-slate-400">{results.length} {results.length === 1 ? "item" : "items"}</p>
      <div id={resultsId} role="listbox" aria-label="Canvas results" className="min-h-0 max-h-[min(420px,50dvh)] flex-1 overflow-y-auto overscroll-contain p-2 pt-0">
        {results.map((node, index) => {
          const type = node.node_type || "milestone";
          const Icon = type === "aws_service" ? Box : type === "group" ? Map : type === "annotation" ? StickyNote : Flag;
          return <button key={node.id} id={`${resultsId}-${index}`} type="button" role="option" aria-selected={highlightedIndex === index}
            onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onClick={() => jumpToNode(node.id)}
            className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-neutral-50 focus-visible:bg-emerald-50 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800 ${highlightedIndex === index ? "bg-emerald-50 dark:bg-slate-800" : ""}`}>
            <span className="rounded-lg bg-neutral-100 p-2 text-neutral-500 dark:bg-slate-800 dark:text-slate-400"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-neutral-900 dark:text-white">{node.title || "Untitled"}</span>
              <span className="mt-0.5 block truncate text-[10px] text-neutral-500 dark:text-slate-400">{type === "aws_service" ? `AWS · ${node.aws_metadata?.region || "No region"}` : type === "group" ? "Container" : type === "annotation" ? "Note" : node.status.replaceAll("_", " ")}</span></span>
          </button>;
        })}
        {!results.length && <p className="px-3 py-8 text-center text-xs text-neutral-500 dark:text-slate-400">{nodes.length ? "No matches. Try another search or filter." : "Add your first milestone or AWS resource to get started."}</p>}
      </div>
    </section>}
  </div>;
}
