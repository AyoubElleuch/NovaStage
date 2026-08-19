"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Shield, X } from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="dash-fade fixed inset-0 z-[90] flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
        className="dash-pop relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close privacy policy dialog"
          className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 border-b border-neutral-100 pb-5 pr-8">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-800">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="privacy-policy-title"
              className="text-xl font-semibold tracking-tight text-neutral-900"
            >
              Privacy Policy
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              NovaStage Data Commitment &amp; Privacy Standards
            </p>
          </div>
        </div>

        {/* Modal Content */}
        <div
          tabIndex={0}
          className="flex-1 space-y-6 overflow-y-auto py-5 pr-4 text-[13px] leading-relaxed text-neutral-600 focus-visible:outline-none"
        >
          {/* Key Principles Banner */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Our Core Privacy Principles
            </h3>
            <p className="mt-1.5 text-xs text-neutral-600 leading-normal">
              We do not sell your personal or project data. We do not track your behavior across the web, we do not record session replays, and we collect only the minimum data required to deliver NovaStage.
            </p>
          </div>

          {/* Section 1: Data We Collect */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">1. Information We Collect</h3>
            <p>
              We only collect data that you voluntarily provide to us when creating an account, joining our waitlist, or collaborating on projects:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1 text-neutral-600">
              <li>
                <strong className="font-medium text-neutral-800">Account &amp; Identity:</strong> Email address, username, full name, and optional avatar image (supplied directly or via GitHub OAuth).
              </li>
              <li>
                <strong className="font-medium text-neutral-800">Waitlist Information:</strong> Email address and authentication provider when applying for access.
              </li>
              <li>
                <strong className="font-medium text-neutral-800">Workspace &amp; Project Data:</strong> Project titles, descriptions, milestone nodes, checklist items, and workflow dependency links that you create or edit.
              </li>
              <li>
                <strong className="font-medium text-neutral-800">Transactional Communications:</strong> Operational emails necessary for waitlist confirmations, invitation notices, and password resets.
              </li>
            </ul>
          </section>

          {/* Section 2: Real-time Collaboration */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">2. Ephemeral Real-Time Collaboration</h3>
            <p>
              NovaStage features interactive multi-user canvas collaboration. Real-time events — such as active milestone edit locks and live multiplayer cursor positions — are streamed ephemerally over secure WebSocket channels between connected project collaborators. This transient collaboration state is held in-memory and is <strong>never recorded or stored permanently</strong>.
            </p>
          </section>

          {/* Section 3: What We Never Do */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">3. Zero Selling &amp; Zero Behavioral Tracking</h3>
            <ul className="list-inside list-disc space-y-1.5 pl-1 text-neutral-600">
              <li>
                <strong className="font-medium text-neutral-800">No Data Selling:</strong> We never sell, monetize, rent, or trade your personal information or workspace content with third parties or data brokers.
              </li>
              <li>
                <strong className="font-medium text-neutral-800">No Telemetry or Tracking:</strong> We do not deploy third-party advertising cookies, session replay recording software, or cross-site tracking scripts.
              </li>
              <li>
                <strong className="font-medium text-neutral-800">No Third-Party Analytics:</strong> Your keystrokes, sessions, and workflows remain completely private to your authorized workspace members.
              </li>
            </ul>
          </section>

          {/* Section 4: Account Deletion */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">4. Account Deletion &amp; Total Data Purge</h3>
            <p>
              You maintain full ownership of your data and have an absolute right to be forgotten. When you choose to delete your account from your Account Settings:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1 text-neutral-600">
              <li>
                Your authentication record is permanently purged from our identity service.
              </li>
              <li>
                Our database immediately cascades and removes your user profile, role permissions, waitlist history, and join requests.
              </li>
              <li>
                Projects owned solely by you — including all milestone nodes, checkpoints, and dependency links — are completely and irreversibly deleted.
              </li>
              <li>
                For shared projects with other active team members, ownership is safely transferred to remaining collaborators while your personal association is completely erased.
              </li>
            </ul>
            <p className="text-xs text-neutral-500">
              Once deleted, no shadow profiles, retained backups of your credentials, or lingering records remain.
            </p>
          </section>

          {/* Section 5: Security */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">5. Data Security &amp; Isolation</h3>
            <p>
              Your data is protected with PostgreSQL Row-Level Security (RLS) policies and Role-Based Access Controls (RBAC), ensuring that only verified project members can access project resources. Passwords and credentials are encrypted using industry-standard hashing algorithms.
            </p>
          </section>
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

interface PrivacyPolicyTriggerProps {
  children?: ReactNode;
  className?: string;
  variant?: "link" | "sidebar-button";
  collapsed?: boolean;
}

export function PrivacyPolicyTrigger({
  children,
  className,
  variant = "link",
  collapsed = false,
}: PrivacyPolicyTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === "sidebar-button") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={collapsed ? "Privacy Policy" : undefined}
          className={
            className ||
            `group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 ${
              collapsed ? "justify-center px-0" : ""
            }`
          }
        >
          <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">Privacy Policy</span>}
        </button>
        <PrivacyPolicyModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
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
        {children || "Privacy Policy"}
      </button>
      <PrivacyPolicyModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
