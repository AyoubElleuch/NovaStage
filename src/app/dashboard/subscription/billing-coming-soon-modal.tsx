"use client";

import { useEffect, useState } from "react";
import { X, Check, Mail, ShieldCheck } from "lucide-react";

interface BillingComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: "plus" | "pro" | "enterprise" | null;
  hasPlusCredit?: boolean;
  proPrice?: string;
}

export default function BillingComingSoonModal({
  isOpen,
  onClose,
  selectedPlan,
  hasPlusCredit = false,
  proPrice,
}: BillingComingSoonModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleClose = () => {
    setEmail("");
    setIsSubmitted(false);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const planTitle =
    selectedPlan === "plus"
      ? "Plus Plan ($1.99/mo)"
      : selectedPlan === "pro"
      ? hasPlusCredit
        ? `Pro Plan (${proPrice || "$3.00"}/mo — with Plus upgrade credit applied)`
        : "Pro Plan ($4.99/mo)"
      : "Enterprise Tier";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitted(true);
    setTimeout(() => {
      // Auto close after brief acknowledgment
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs dash-fade dark:bg-black/80"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="dash-pop relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-[#283548] dark:bg-[#151c27]">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:hover:bg-[#1e2736] dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <span className="inline-block rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300">
            Preview Status &bull; Coming Soon
          </span>
          <h2
            id="modal-headline"
            className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white"
          >
            Subscriptions Are Coming Soon
          </h2>
        </div>

        <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
          <p>
            You selected the{" "}
            <strong className="font-semibold text-neutral-900 dark:text-white">
              {planTitle}
            </strong>
            .
          </p>
          <p className="text-neutral-500 dark:text-neutral-400">
            NovaStage is currently operating in early beta preview. Our corporate entity and automated payment processing are being finalized, so checkout is not live yet.
          </p>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4 text-xs text-neutral-600 dark:border-[#283548]/80 dark:bg-[#1e2736]/50 dark:text-neutral-300">
            <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Provisional Testing Notice
            </div>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              During this preview phase, platform administrators can upgrade accounts to test Plus and Pro features. All current features remain fully accessible.
            </p>
          </div>
        </div>

        {/* Notify / Waitlist Form */}
        <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-[#283548]">
          {isSubmitted ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold">You are on the priority launch list!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  We will email you the moment payment and automated upgrades go live.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label
                htmlFor="notify-email"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Get notified when billing opens
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="notify-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-[#283548] dark:bg-[#111722] dark:text-white dark:focus:border-blue-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Notify Me
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>Questions?</span>
            <a
              href="mailto:support@novastage.com?subject=Subscription%20Inquiry"
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
