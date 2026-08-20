"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import { TermsOfServiceContent } from "./terms-of-service-content";

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptySubscribe = () => () => {};

export function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  const modalContent = (
    <div
      className="dash-fade fixed inset-0 z-[90] flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-of-service-title"
        className="dash-pop relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close terms of service dialog"
          className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 border-b border-neutral-100 pb-5 pr-8">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-800">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="terms-of-service-title"
              className="text-xl font-semibold tracking-tight text-neutral-900"
            >
              Terms of Use
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              NovaStage Platform Terms &amp; User Agreement
            </p>
          </div>
        </div>

        {/* Modal Content */}
        <div
          tabIndex={0}
          className="flex-1 overflow-y-auto py-5 pr-4 text-[13px] leading-relaxed text-neutral-600 focus-visible:outline-none"
        >
          <TermsOfServiceContent />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 cursor-pointer items-center justify-center rounded-lg bg-neutral-900 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

interface TermsOfServiceTriggerProps {
  children?: ReactNode;
  className?: string;
  variant?: "link" | "sidebar-button";
  collapsed?: boolean;
}

export function TermsOfServiceTrigger({
  children,
  className,
  variant = "link",
  collapsed = false,
}: TermsOfServiceTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === "sidebar-button") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={collapsed ? "Terms of Use" : undefined}
          className={
            className ||
            `group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 ${
              collapsed ? "justify-center px-0" : ""
            }`
          }
        >
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">Terms of Use</span>}
        </button>
        <TermsOfServiceModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "cursor-pointer text-xs font-medium text-neutral-400 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-700 hover:decoration-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded"
        }
      >
        {children || "Terms of Use"}
      </button>
      <TermsOfServiceModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

// Aliases
export const TermsOfUseModal = TermsOfServiceModal;
export const TermsOfUseTrigger = TermsOfServiceTrigger;
