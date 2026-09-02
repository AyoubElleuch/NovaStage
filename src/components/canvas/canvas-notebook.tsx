"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, HelpCircle, Plus, Trash2, X } from "lucide-react";

type NotebookTab = "notes" | "questions";

interface NotebookEntry {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

type NotebookEntries = Record<NotebookTab, NotebookEntry[]>;

interface CanvasNotebookProps {
  projectId: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const emptyEntries = (): NotebookEntries => ({ notes: [], questions: [] });

const tabDetails: Record<NotebookTab, { label: string; singular: string; placeholder: string }> = {
  notes: {
    label: "Notes",
    singular: "note",
    placeholder: "Capture decisions, links, and context for this roadmap...",
  },
  questions: {
    label: "Questions",
    singular: "question",
    placeholder: "Describe an open question or blocker...",
  },
};

function createEntry(tab: NotebookTab, body = ""): NotebookEntry {
  return {
    id: crypto.randomUUID(),
    title: body.split("\n")[0]?.slice(0, 60) || `Untitled ${tabDetails[tab].singular}`,
    body,
    updatedAt: new Date().toISOString(),
  };
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CanvasNotebook({ projectId, isOpen, onToggle, onClose }: CanvasNotebookProps) {
  const [activeTab, setActiveTab] = useState<NotebookTab>("notes");
  const [entries, setEntries] = useState<NotebookEntries>(emptyEntries);
  const [selectedIds, setSelectedIds] = useState<Partial<Record<NotebookTab, string>>>({});
  const storageKey = `novastage:notebook:${projectId}:entries`;
  const activeEntries = entries[activeTab];
  const selectedEntry = activeEntries.find((entry) => entry.id === selectedIds[activeTab]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedEntries = window.localStorage.getItem(storageKey);
      let nextEntries = emptyEntries();

      if (savedEntries) {
        try {
          nextEntries = JSON.parse(savedEntries) as NotebookEntries;
        } catch {
          nextEntries = emptyEntries();
        }
      } else {
        for (const tab of Object.keys(tabDetails) as NotebookTab[]) {
          const legacyValue = window.localStorage.getItem(`novastage:notebook:${projectId}:${tab}`);
          if (legacyValue) nextEntries[tab] = [createEntry(tab, legacyValue)];
        }
        window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
      }

      setEntries(nextEntries);
      setSelectedIds({ notes: nextEntries.notes[0]?.id, questions: nextEntries.questions[0]?.id });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [projectId, storageKey]);

  const persistEntries = (nextEntries: NotebookEntries) => {
    setEntries(nextEntries);
    window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  };

  const addEntry = () => {
    const entry = createEntry(activeTab);
    persistEntries({ ...entries, [activeTab]: [entry, ...activeEntries] });
    setSelectedIds((current) => ({ ...current, [activeTab]: entry.id }));
  };

  const updateEntry = (updates: Partial<Pick<NotebookEntry, "title" | "body">>) => {
    if (!selectedEntry) return;
    const nextEntries = activeEntries.map((entry) =>
      entry.id === selectedEntry.id ? { ...entry, ...updates, updatedAt: new Date().toISOString() } : entry
    );
    persistEntries({ ...entries, [activeTab]: nextEntries });
  };

  const deleteEntry = (entryId: string) => {
    const nextTabEntries = activeEntries.filter((entry) => entry.id !== entryId);
    persistEntries({ ...entries, [activeTab]: nextTabEntries });
    if (selectedIds[activeTab] === entryId) {
      setSelectedIds((current) => ({ ...current, [activeTab]: nextTabEntries[0]?.id }));
    }
  };

  const selectTab = (tab: NotebookTab) => {
    setActiveTab(tab);
    if (!selectedIds[tab] && entries[tab][0]) {
      setSelectedIds((current) => ({ ...current, [tab]: entries[tab][0].id }));
    }
  };

  return (
    <>
      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-xs md:hidden dark:bg-black/60"
              onClick={onClose}
              aria-hidden="true"
            />
            <aside
              aria-label="Project notebook"
              className="canvas-panel-enter fixed top-0 right-0 z-50 flex h-dvh w-full sm:max-w-105 flex-col border-l border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-[#283548] dark:bg-[#161d27]/95"
            >
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#283548] px-5 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Project notebook</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={addEntry} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New
                </button>
                <button type="button" onClick={onClose} title="Close notebook" aria-label="Close notebook" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-[#1e2634] dark:hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-neutral-100 dark:border-[#283548] px-5 pt-3">
              <div className="flex gap-5" role="tablist" aria-label="Notebook sections">
                {(Object.keys(tabDetails) as NotebookTab[]).map((tab) => (
                  <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => selectTab(tab)} className={`cursor-pointer border-b-2 pb-3 text-xs font-semibold transition-colors ${activeTab === tab ? "border-neutral-900 text-neutral-900 dark:border-emerald-500 dark:text-white" : "border-transparent text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"}`}>
                    {tabDetails[tab].label}<span className="ml-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">{entries[tab].length}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeEntries.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <BookOpen className="h-6 w-6 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">No {tabDetails[activeTab].label.toLowerCase()} yet</h3>
                <p className="mt-1 max-w-60 text-xs leading-5 text-neutral-400 dark:text-neutral-500">Add one to preserve context alongside this project roadmap.</p>
                <button type="button" onClick={addEntry} className="mt-4 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New {tabDetails[activeTab].singular}
                </button>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div aria-label={`${tabDetails[activeTab].label} history`} className="max-h-44 overflow-y-auto border-b border-neutral-100 dark:border-[#283548] p-3">
                  <div className="space-y-1">
                    {activeEntries.map((entry) => (
                      <div key={entry.id} className={`group flex items-center gap-2 rounded-lg px-2 py-1 ${selectedEntry?.id === entry.id ? "bg-neutral-100 dark:bg-[#1e2634]" : "hover:bg-neutral-50 dark:hover:bg-[#121721]"}`}>
                        <button type="button" onClick={() => setSelectedIds((current) => ({ ...current, [activeTab]: entry.id }))} className="min-w-0 flex-1 cursor-pointer px-1 py-1 text-left">
                          <span className="block truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">{entry.title}</span>
                          <span className="mt-0.5 block text-[10px] text-neutral-400 dark:text-neutral-500">{formatUpdatedAt(entry.updatedAt)}</span>
                        </button>
                        <button type="button" title={`Delete ${tabDetails[activeTab].singular}`} aria-label={`Delete ${entry.title}`} onClick={() => deleteEntry(entry.id)} className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-300 opacity-0 hover:bg-white hover:text-red-500 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-[#283548] dark:hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedEntry && (
                  <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
                    <label htmlFor="notebook-entry-title" className="sr-only">Entry title</label>
                    <input id="notebook-entry-title" value={selectedEntry.title} onChange={(event) => updateEntry({ title: event.target.value })} placeholder={`${tabDetails[activeTab].singular} title`} className="border-0 bg-transparent text-sm font-semibold text-neutral-900 outline-none placeholder:text-neutral-300 dark:text-white dark:placeholder:text-neutral-600" />
                    <label htmlFor="notebook-entry-body" className="sr-only">Entry content</label>
                    <textarea id="notebook-entry-body" value={selectedEntry.body} onChange={(event) => updateEntry({ body: event.target.value })} placeholder={tabDetails[activeTab].placeholder} className="mt-3 min-h-0 flex-1 resize-none rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-sm leading-6 text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:focus:border-emerald-500 dark:focus:bg-[#121721]" />
                    <p className="mt-3 text-[11px] text-neutral-400 dark:text-neutral-500">Private to this browser and saved automatically.</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </>,
        document.body
      )}

      <button type="button" onClick={onToggle} title="Open project notebook" aria-label="Open project notebook" aria-expanded={isOpen} className={`flex h-9 w-9 sm:h-12 sm:w-12 cursor-pointer items-center justify-center rounded-xl sm:rounded-2xl border shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-colors ${isOpen ? "border-neutral-900 bg-neutral-900 text-white dark:border-emerald-600 dark:bg-emerald-600" : "border-neutral-200/80 bg-white/95 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:border-[#283548] dark:bg-[#161d27]/95 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"}`}>
        {isOpen ? <X className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
      </button>
    </>
  );
}
