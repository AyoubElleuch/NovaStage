"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowUp,
  Loader2,
  Lock,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  X,
  Waypoints,
} from "lucide-react";
import { PrivacyPolicyTrigger } from "@/components/privacy/privacy-policy-modal";
import { AIGenerationMode } from "@/lib/ai/types";

interface CanvasAIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  portalContainer?: HTMLElement | null;
  requestsRemaining?: number;
  onSubmitPrompt?: (prompt: string, mode?: string) => Promise<void> | void;
}

const getThinkingStages = (mode: AIGenerationMode) => {
  if (mode === "aws_architecture") {
    return [
      {
        buttonLabel: "Analyzing…",
        title: "Phase 1: Analyzing AWS requirements...",
        detail: "Evaluating AWS services, data flow, and networking constraints...",
        pct: "25%",
      },
      {
        buttonLabel: "Generating…",
        title: "Phase 2: Generating service topology...",
        detail: "Synthesizing AWS resources and IAM roles...",
        pct: "55%",
      },
      {
        buttonLabel: "Validating…",
        title: "Phase 3: Validating architecture...",
        detail: "Verifying resource availability and security groups...",
        pct: "80%",
      },
      {
        buttonLabel: "Laying out…",
        title: "Phase 4: Laying out infrastructure...",
        detail: "Auto-arranging AWS components and connecting edges...",
        pct: "95%",
      },
    ];
  }
  if (mode === "full_stack") {
    return [
      {
        buttonLabel: "Decomposing…",
        title: "Phase 1: Decomposing project...",
        detail: "Analyzing domain requirements, tech stack constraints, risk factors, and parallel tracks...",
        pct: "25%",
      },
      {
        buttonLabel: "Generating…",
        title: "Phase 2: Generating workflow & architecture...",
        detail: "Synthesizing domain-specific engineering milestones and parallel branches...",
        pct: "55%",
      },
      {
        buttonLabel: "Validating…",
        title: "Phase 3: Validating DAG & topology...",
        detail: "Running cycle detection DFS, eliminating orphan nodes, verifying edge integrity...",
        pct: "80%",
      },
      {
        buttonLabel: "Synchronizing…",
        title: "Phase 4: Synchronizing canvas...",
        detail: "Calculating non-overlapping coordinates, persisting database changes...",
        pct: "95%",
      },
    ];
  }
  return [
    {
      buttonLabel: "Decomposing…",
      title: "Phase 1: Architectural Decomposition",
      detail: "Analyzing domain requirements, tech stack constraints, risk factors, and parallel tracks…",
      pct: "25%",
    },
    {
      buttonLabel: "Generating…",
      title: "Phase 2: Deep Branching DAG Generation",
      detail: "Synthesizing domain-specific engineering milestones, parallel branches, and actionable checklists…",
      pct: "55%",
    },
    {
      buttonLabel: "Validating…",
      title: "Phase 3: DAG Validation & Cycle Detection",
      detail: "Running cycle detection DFS, eliminating orphan nodes, verifying edge integrity, and padding tasks…",
      pct: "80%",
    },
    {
      buttonLabel: "Synchronizing…",
      title: "Phase 4: Auto-Layout & Multiplayer Sync",
      detail: "Calculating non-overlapping coordinates, persisting database changes, and broadcasting to peers…",
      pct: "95%",
    },
  ];
};

// Extend window for Web Speech API types
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const emptySubscribe = () => () => {};

export default function CanvasAIAssistant({
  isOpen,
  onToggle,
  onClose,
  portalContainer,
  requestsRemaining = 10,
  onSubmitPrompt,
}: CanvasAIAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AIGenerationMode>("workflow");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const speechSupported = useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => true
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isListening) stopListening();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isListening, onClose, stopListening]);

  // Adjust textarea height smoothly based on content
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 68), 240);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > 240 ? "auto" : "hidden";
  }, []);

  // Focus and adjust height when prompt or open state changes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
        adjustHeight();
      }, 50);
    }
  }, [isOpen, adjustHeight]);

  useEffect(() => {
    adjustHeight();
  }, [prompt, adjustHeight]);

  useEffect(() => {
    if (!isOpen) return;

    const updateNotificationOffset = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const desiredOffset = window.innerHeight - dialog.getBoundingClientRect().top + 16;
      const visibleOffset = Math.min(desiredOffset, window.innerHeight - 120);
      document.documentElement.style.setProperty(
        "--canvas-ai-notification-offset",
        `${Math.max(24, visibleOffset)}px`
      );
    };

    updateNotificationOffset();
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateNotificationOffset);
    if (dialogRef.current) resizeObserver?.observe(dialogRef.current);
    window.addEventListener("resize", updateNotificationOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateNotificationOffset);
      document.documentElement.style.removeProperty("--canvas-ai-notification-offset");
    };
  }, [isOpen]);

  // Progressive Thinking Stage Interval
  useEffect(() => {
    if (!isThinking) return;

    const interval = setInterval(() => {
      setThinkingStep((prev) => {
        const stagesLen = getThinkingStages(mode).length;
        return prev < stagesLen - 1 ? prev + 1 : prev;
      });
    }, 850);

    return () => clearInterval(interval);
  }, [isThinking, mode]);

  // Speech Recognition Control
  const startListening = () => {
    setSpeechError(null);
    setApiError(null);
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setPrompt(currentTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== "no-speech") {
          setSpeechError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechError("Unable to access microphone. Please check permissions.");
      setIsListening(false);
    }
  };

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isThinking || requestsRemaining <= 0) return;

    if (isListening) stopListening();
    setApiError(null);
    setIsThinking(true);
    setThinkingStep(0);
    setSubmittedMessage(trimmed);

    try {
      if (onSubmitPrompt) {
        await onSubmitPrompt(trimmed, mode);
      } else {
        // Visual placeholder delay for demo/thinking simulation
        await new Promise((resolve) => setTimeout(resolve, 2400));
      }
      setPrompt("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate workflow";
      setApiError(msg);
    } finally {
      setIsThinking(false);
    }
  };

  const isQuotaDepleted = requestsRemaining <= 0;
  const stages = getThinkingStages(mode);
  const currentStage = stages[thinkingStep] || stages[0];

  return (
    <>
      {/* Floating AI Trigger Button (Separated from bottom dock) */}
      <button
        type="button"
        onClick={onToggle}
        title={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        aria-label="Toggle AI Assistant"
        className={`group relative flex h-9 sm:h-12 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border px-2.5 sm:px-3.5 shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all cursor-pointer select-none ${
          isOpen
            ? "border-neutral-900 bg-neutral-900 text-white shadow-neutral-900/20 scale-[1.03] dark:border-emerald-600 dark:bg-emerald-600"
            : "border-neutral-200/80 bg-white/95 text-neutral-800 hover:border-neutral-300 hover:bg-white hover:scale-[1.02] dark:border-[#283548] dark:bg-[#161d27]/95 dark:text-neutral-200 dark:hover:border-[#384961] dark:hover:bg-[#1e2634]"
        }`}
      >
        <span
          className={`grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl transition-colors ${
            isOpen
              ? "bg-white/20 text-white"
              : "bg-neutral-100 text-neutral-800 group-hover:bg-neutral-200/80 dark:bg-[#1e2634] dark:text-neutral-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
        <span className="text-xs font-semibold tracking-tight hidden xs:inline">AI Assistant</span>
        <span className="text-xs font-semibold tracking-tight xs:hidden">AI</span>
        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {/* Floating Chat / Prompt Popup Panel (Positioned right above tools dock) */}
      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-xs sm:hidden dark:bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-assistant-title"
            className="dash-pop fixed bottom-20 inset-x-3 sm:inset-x-auto z-50 max-h-[85vh] overflow-y-auto sm:bottom-24 sm:left-1/2 flex w-auto sm:w-[calc(100%-24px)] max-w-lg sm:-translate-x-1/2 flex-col rounded-2xl border border-neutral-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-2xl transition-all sm:max-w-xl dark:border-[#283548] dark:bg-[#161d27]/95"
          >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#283548] px-1 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="ai-assistant-title"
                  className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white"
                >
                  Generate or Update Workflow with AI
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    isQuotaDepleted
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                      : "bg-neutral-100 text-neutral-600 border-neutral-200/80 dark:bg-[#1e2634] dark:text-neutral-300 dark:border-[#283548]"
                  }`}
                >
                  {isQuotaDepleted ? "0 / 10 remaining" : `${requestsRemaining} of 10 requests left`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Describe a pipeline to build, or ask to update the current one
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI Assistant"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form & Input Area */}
          <form onSubmit={handleSubmit} className="mt-2.5 space-y-2">
            {/* Mode Selector */}
            <div className="flex p-1 bg-neutral-100 dark:bg-[#1e2634] rounded-lg border border-neutral-200/60 dark:border-[#283548] w-fit">
              <button
                type="button"
                onClick={() => setMode('workflow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  mode === 'workflow' ? 'bg-white dark:bg-[#2a3649] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <Waypoints className="h-3.5 w-3.5" />
                Workflow
              </button>
              <button
                type="button"
                onClick={() => setMode('aws_architecture')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  mode === 'aws_architecture' ? 'bg-white dark:bg-[#2a3649] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <span className="font-bold text-[#FF9900]">AWS</span>
                AWS Architecture
              </button>
              <button
                type="button"
                onClick={() => setMode('full_stack')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  mode === 'full_stack' ? 'bg-white dark:bg-[#2a3649] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <Waypoints className="h-3.5 w-3.5" />
                  <span className="font-bold text-[#FF9900] text-[10px]">AWS</span>
                </div>
                Full Stack
              </button>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white shadow-2xs transition-all focus-within:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/5 dark:border-[#283548] dark:bg-[#121721] dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/10">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  isQuotaDepleted
                    ? "You have reached your 10 AI workflow limit."
                    : "Describe your project or ask to modify the pipeline (e.g., 'Add a QA testing step between step 2 and step 3', 'Add Redis cache checkpoints to step 2')..."
                }
                disabled={isThinking || isQuotaDepleted}
                style={{ height: "68px", overflowY: "hidden" }}
                className="w-full resize-none bg-transparent px-3.5 pt-3 pb-2 text-[13px] leading-relaxed text-neutral-900 placeholder-neutral-400 focus:outline-none disabled:opacity-50 transition-[height] duration-200 ease-out dark:text-white dark:placeholder-neutral-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              {/* Bottom Controls Bar cleanly separated below Textarea */}
              <div className="flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-[#283548] px-3 py-2">
                {/* Voice / Mic Button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    disabled={!speechSupported || isThinking || isQuotaDepleted}
                    title={
                      !speechSupported
                        ? "Voice recognition not supported in browser"
                        : isListening
                          ? "Stop listening"
                          : "Record voice input"
                    }
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isListening
                        ? "bg-red-500 text-white shadow-xs animate-pulse"
                        : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300 dark:hover:bg-[#1e2634]"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-3.5 w-3.5" />
                        <span>Listening…</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" />
                        <span>Voice</span>
                      </>
                    )}
                  </button>

                  {isListening && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                      <Volume2 className="h-3.5 w-3.5 animate-bounce" />
                      <span>Speak now</span>
                    </span>
                  )}
                </div>

                {/* Submit / Clear Buttons */}
                <div className="flex items-center gap-2">
                  {prompt && !isQuotaDepleted && !isThinking && (
                    <button
                      type="button"
                      onClick={() => setPrompt("")}
                      className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer dark:hover:text-neutral-200"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={!prompt.trim() || isThinking || isQuotaDepleted}
                    className="flex h-8 min-w-23 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    {isThinking ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-[11px]">{currentStage.buttonLabel}</span>
                      </>
                    ) : isQuotaDepleted ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        <span>Limit Reached</span>
                      </>
                    ) : (
                      <>
                        <span>Generate</span>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Transparency & Privacy Note */}
            <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400 dark:text-neutral-500">
              <span>Google Gemini AI &bull; Prompts are not stored</span>
              <PrivacyPolicyTrigger className="cursor-pointer text-[11px] text-neutral-400 dark:text-neutral-500 underline decoration-neutral-300 dark:decoration-neutral-600 underline-offset-2 transition-colors hover:text-neutral-700 dark:hover:text-neutral-300">
                AI Privacy
              </PrivacyPolicyTrigger>
            </div>

            {/* Collision or API Error Notice */}
            {apiError && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p>{apiError}</p>
                </div>
              </div>
            )}

            {/* Speech Error Notice */}
            {speechError && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{speechError}</span>
              </div>
            )}

            {/* Progressive Thinking & Planning State Indicator */}
            {isThinking && (
              <div className="dash-pop rounded-xl border border-neutral-200/90 bg-neutral-50/90 p-3 text-xs text-neutral-600 shadow-2xs space-y-2 dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-900 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-neutral-900 dark:text-white text-[12px]">
                      {currentStage.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-500">
                    Step {thinkingStep + 1} of 4
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                  {currentStage.detail}
                </p>

                {/* Animated Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70 dark:bg-[#1e2634]">
                  <div
                    className="h-full bg-neutral-900 dark:bg-emerald-500 transition-all duration-700 ease-out rounded-full"
                    style={{ width: currentStage.pct }}
                  />
                </div>

                <div className="truncate border-t border-neutral-200/60 dark:border-[#283548] pt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 italic">
                  “{submittedMessage}”
                </div>
              </div>
            )}
          </form>
        </div>
        </>,
        portalContainer ?? document.body
      )}
    </>
  );
}
