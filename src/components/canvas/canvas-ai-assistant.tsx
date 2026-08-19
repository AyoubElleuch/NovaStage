"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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
} from "lucide-react";
import { PrivacyPolicyTrigger } from "@/components/privacy/privacy-policy-modal";

interface CanvasAIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  requestsRemaining?: number;
  onSubmitPrompt?: (prompt: string) => Promise<void> | void;
}

// Progressive thinking stage descriptors
const THINKING_STAGES = [
  {
    buttonLabel: "Analyzing…",
    title: "Analyzing request & canvas graph",
    detail: "Decomposing workflow scope and evaluating topological graph changes…",
    pct: "25%",
  },
  {
    buttonLabel: "Structuring…",
    title: "Drafting milestones & checkpoints",
    detail: "Structuring actionable checkpoint subtasks and adjusting step order…",
    pct: "55%",
  },
  {
    buttonLabel: "Connecting…",
    title: "Mapping & rewiring dependencies",
    detail: "Connecting sequential and parallel DAG wires across phases…",
    pct: "80%",
  },
  {
    buttonLabel: "Finalizing…",
    title: "Computing layout, shift & sync",
    detail: "Calculating non-overlapping coordinates and synchronizing canvas…",
    pct: "95%",
  },
];

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
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
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
  requestsRemaining = 10,
  onSubmitPrompt,
}: CanvasAIAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  // Progressive Thinking Stage Interval
  useEffect(() => {
    if (!isThinking) return;

    const interval = setInterval(() => {
      setThinkingStep((prev) =>
        prev < THINKING_STAGES.length - 1 ? prev + 1 : prev
      );
    }, 850);

    return () => clearInterval(interval);
  }, [isThinking]);

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
        await onSubmitPrompt(trimmed);
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
  const currentStage = THINKING_STAGES[thinkingStep] || THINKING_STAGES[0];

  return (
    <>
      {/* Floating AI Trigger Button (Separated from bottom dock) */}
      <button
        type="button"
        onClick={onToggle}
        title={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        aria-label="Toggle AI Assistant"
        className={`group relative flex h-12 items-center gap-2 rounded-2xl border px-3.5 shadow-xl backdrop-blur-xl transition-all cursor-pointer select-none ${
          isOpen
            ? "border-neutral-900 bg-neutral-900 text-white shadow-neutral-900/20 scale-[1.03]"
            : "border-neutral-200/80 bg-white/95 text-neutral-800 hover:border-neutral-300 hover:bg-white hover:scale-[1.02]"
        }`}
      >
        <span
          className={`grid h-7 w-7 place-items-center rounded-xl transition-colors ${
            isOpen
              ? "bg-white/20 text-white"
              : "bg-neutral-100 text-neutral-800 group-hover:bg-neutral-200/80"
          }`}
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold tracking-tight">AI Assistant</span>
        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {/* Floating Chat / Prompt Popup Panel (Positioned right above tools dock) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-assistant-title"
          className="dash-pop absolute bottom-[72px] left-1/2 z-30 flex w-[92vw] max-w-lg -translate-x-1/2 flex-col rounded-2xl border border-neutral-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-2xl transition-all sm:max-w-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-1 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="ai-assistant-title"
                  className="text-sm font-semibold tracking-tight text-neutral-900"
                >
                  Generate or Update Workflow with AI
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    isQuotaDepleted
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-neutral-100 text-neutral-600 border-neutral-200/80"
                  }`}
                >
                  {isQuotaDepleted ? "0 / 10 remaining" : `${requestsRemaining} of 10 requests left`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Describe a pipeline to build, or ask to update the current one
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI Assistant"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form & Input Area */}
          <form onSubmit={handleSubmit} className="mt-2.5 space-y-2">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-2xs transition-all focus-within:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/5">
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
                className="w-full resize-none bg-transparent px-3.5 pt-3 pb-2 text-[13px] leading-relaxed text-neutral-900 placeholder-neutral-400 focus:outline-none disabled:opacity-50 transition-[height] duration-200 ease-out"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              {/* Bottom Controls Bar cleanly separated below Textarea */}
              <div className="flex items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2">
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
                        : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
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
                    <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
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
                      className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={!prompt.trim() || isThinking || isQuotaDepleted}
                    className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 min-w-[92px]"
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
            <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
              <span>Google Gemini AI &bull; Prompts are not stored</span>
              <PrivacyPolicyTrigger className="cursor-pointer text-[11px] text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-700">
                AI Privacy
              </PrivacyPolicyTrigger>
            </div>

            {/* Collision or API Error Notice */}
            {apiError && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900 border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p>{apiError}</p>
                </div>
              </div>
            )}

            {/* Speech Error Notice */}
            {speechError && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 border border-amber-200/70">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{speechError}</span>
              </div>
            )}

            {/* Progressive Thinking & Planning State Indicator */}
            {isThinking && (
              <div className="dash-pop rounded-xl border border-neutral-200/90 bg-neutral-50/90 p-3 text-xs text-neutral-600 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-900 shrink-0" />
                    <span className="font-semibold text-neutral-900 text-[12px]">
                      {currentStage.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-neutral-400">
                    Step {thinkingStep + 1} of 4
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 leading-snug">
                  {currentStage.detail}
                </p>

                {/* Animated Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-700 ease-out rounded-full"
                    style={{ width: currentStage.pct }}
                  />
                </div>

                <div className="truncate border-t border-neutral-200/60 pt-1.5 text-[11px] text-neutral-400 italic">
                  “{submittedMessage}”
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}
