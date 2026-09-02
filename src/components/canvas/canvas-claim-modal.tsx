"use client";

import React from "react";
import { Check, Handshake, X } from "lucide-react";
import { CanvasClaimRequest } from "@/lib/canvas/types";

interface CanvasClaimModalProps {
  pendingRequest: CanvasClaimRequest | null;
  onResolve: (requestId: string, accept: boolean) => void;
}

export default function CanvasClaimModal({
  pendingRequest,
  onResolve,
}: CanvasClaimModalProps) {
  if (!pendingRequest) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="w-96 rounded-2xl border border-amber-200/90 bg-white p-4 shadow-2xl backdrop-blur-xl dark:border-amber-800/70 dark:bg-[#161d27]">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Handshake className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              Claim Handoff Requested
            </h4>
            <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              <strong>{pendingRequest.requester_name || "A collaborator"}</strong> wants to take over editing:
            </p>
            <p className="mt-1 text-xs font-semibold text-neutral-900 dark:text-white truncate rounded-md bg-neutral-100 dark:bg-[#121721] px-2 py-1">
              {pendingRequest.node_title || "Milestone Box"}
            </p>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onResolve(pendingRequest.id, true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-neutral-800 transition-colors cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Grant Claim</span>
              </button>

              <button
                type="button"
                onClick={() => onResolve(pendingRequest.id, false)}
                className="flex items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300 dark:hover:bg-[#283548]"
              >
                <X className="h-3.5 w-3.5" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
