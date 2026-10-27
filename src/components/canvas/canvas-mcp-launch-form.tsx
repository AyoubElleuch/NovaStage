"use client";

import type { FormEvent } from "react";
import type { AIGenerationMode } from "@/lib/ai/types";
import { CodexIcon, ClaudeIcon } from "@/components/assistant-logos";
import CanvasAIModeSelect from "./canvas-ai-mode-select";
import type { DesktopAssistant } from "@/lib/mcp/desktop";

const FIELD = "w-full rounded-lg border border-neutral-200 bg-transparent p-2.5 text-xs dark:border-[#384961]";
const LAUNCH_BUTTON = "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed";
const INACTIVE_BUTTON = "border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-[#283548] dark:bg-[#141c28] dark:text-neutral-500";
const CODEX_BUTTON = "cursor-pointer border-neutral-300 bg-white text-neutral-900 enabled:hover:border-neutral-500 enabled:hover:bg-neutral-100 enabled:active:bg-neutral-200 dark:border-[#46566d] dark:bg-[#202c3d] dark:text-neutral-100 dark:enabled:hover:border-emerald-500 dark:enabled:hover:bg-[#293c4d] dark:enabled:active:bg-[#31495b]";
const CLAUDE_BUTTON = "cursor-pointer border-[#d7a38c] bg-[#fff8f3] text-[#9b482d] enabled:hover:border-[#b85b35] enabled:hover:bg-[#f9e7dc] enabled:active:bg-[#f2d8c8] dark:border-[#8b5c47] dark:bg-[#322820] dark:text-[#f0b693] dark:enabled:hover:border-[#dc986f] dark:enabled:hover:bg-[#493225] dark:enabled:active:bg-[#563c2c]";

export default function CanvasMcpLaunchForm({ mode, prompt, busy, onModeChange, onPromptChange, onLaunch, id = "desktop-ai-mode" }: {
  mode: AIGenerationMode;
  prompt: string;
  busy: boolean;
  onModeChange: (mode: AIGenerationMode) => void;
  onPromptChange: (prompt: string) => void;
  onLaunch: (provider: DesktopAssistant) => void;
  id?: string;
}) {
  const canLaunch = Boolean(prompt.trim()) && !busy;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    onLaunch(submitter?.value === "claude" ? "claude" : "codex");
  };
  return <form onSubmit={submit} className="space-y-2">
    <label className="block text-xs font-semibold" htmlFor={id}>What would you like to build?</label>
    <CanvasAIModeSelect id={id} value={mode} onChange={onModeChange} disabled={busy} />
    <textarea required aria-label="Describe your diagram" className={`${FIELD} min-h-24 resize-y leading-5`} maxLength={8000} value={prompt} onChange={event => onPromptChange(event.target.value)} placeholder="A secure serverless app with authentication, a database, monitoring, and delivery milestones…" />
    <div className="grid grid-cols-2 gap-2">
      <button type="submit" name="assistant" value="codex" disabled={!canLaunch} className={`${LAUNCH_BUTTON} ${canLaunch ? CODEX_BUTTON : INACTIVE_BUTTON}`}><CodexIcon className="h-7 w-7" />Open Codex</button>
      <button type="submit" name="assistant" value="claude" disabled={!canLaunch} className={`${LAUNCH_BUTTON} ${canLaunch ? CLAUDE_BUTTON : INACTIVE_BUTTON}`}><ClaudeIcon className="h-7 w-7" />Open Claude</button>
    </div>
    <p className="text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">Desktop app required. No terminal setup. Temporary canvas access lasts 15 minutes. Your assistant account and its limits apply; no NovaStage AI credits.</p>
  </form>;
}
