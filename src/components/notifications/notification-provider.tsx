"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, Check, CheckCircle2, Copy, X } from "lucide-react";

const MAX_VISIBLE_NOTIFICATIONS = 2;
const NOTIFICATION_DURATION = 3000;
const EXIT_DURATION = 220;

type NotificationTone = "success" | "error";
export type NotificationPosition = "bottom-left" | "bottom-right";

export interface NotificationOptions {
  tone?: NotificationTone;
  title: string;
  message?: string;
  detail?: string;
  copyText?: string;
  position?: NotificationPosition;
}

interface NotificationItem extends NotificationOptions {
  id: string;
  isExiting?: boolean;
}

interface NotificationContextValue {
  notify: (options: NotificationOptions) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function NotificationToast({
  notification,
  onDismiss,
  onPause,
  onResume,
}: {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const isError = notification.tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  const handleCopy = async () => {
    if (!notification.copyText) return;

    try {
      await navigator.clipboard.writeText(notification.copyText);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <article
      className={`site-notification ${notification.isExiting ? "site-notification--exiting" : ""} flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl transition-all duration-200 dark:bg-[#161d27] ${
        isError
          ? "border-red-200 text-red-950 dark:border-red-900/60 dark:text-red-200"
          : "border-neutral-200 text-neutral-900 dark:border-[#283548] dark:text-[#f1f5f9]"
      }`}
      role={isError ? "alert" : "status"}
      onMouseEnter={() => onPause(notification.id)}
      onMouseLeave={() => onResume(notification.id)}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
          isError
            ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-xs font-semibold leading-5 text-neutral-900 dark:text-white">
          {notification.title}
        </strong>
        {notification.message && (
          <p className="mt-0.5 text-xs leading-4 text-neutral-500 dark:text-neutral-400">{notification.message}</p>
        )}
        {notification.detail && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-neutral-200/80 bg-neutral-50 px-2.5 py-1.5 font-mono text-[11px] text-neutral-700 dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-300">
            <span className="truncate">{notification.detail}</span>
            {notification.copyText && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                title="Copy notification detail"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-[#1e2634] dark:hover:text-white"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
        title="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </article>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const idCounter = useRef(0);
  const lifetimeTimers = useRef(new Map<string, number>());
  const exitTimers = useRef(new Map<string, number>());
  const dismissedIds = useRef(new Set<string>());
  const hoveredIds = useRef(new Set<string>());

  let pathname: string | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pathname = usePathname();
  } catch {
    pathname = null;
  }

  // Detect whether current page is the canvas view (/dashboard/projects/[slug])
  const isCanvasRoute = Boolean(
    pathname &&
    pathname.startsWith("/dashboard/projects/") &&
    !pathname.endsWith("/settings") &&
    !pathname.endsWith("/deployments")
  );

  const dismiss = useCallback((id: string) => {
    if (dismissedIds.current.has(id)) return;
    dismissedIds.current.add(id);
    hoveredIds.current.delete(id);

    const lifetimeTimer = lifetimeTimers.current.get(id);
    if (lifetimeTimer) window.clearTimeout(lifetimeTimer);
    lifetimeTimers.current.delete(id);

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, isExiting: true } : notification
      )
    );

    const exitTimer = window.setTimeout(() => {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
      exitTimers.current.delete(id);
      dismissedIds.current.delete(id);
    }, EXIT_DURATION);
    exitTimers.current.set(id, exitTimer);
  }, []);

  const startDismissTimer = useCallback((id: string) => {
    const existingTimer = lifetimeTimers.current.get(id);
    if (existingTimer) window.clearTimeout(existingTimer);

    const timer = window.setTimeout(() => {
      lifetimeTimers.current.delete(id);
      if (hoveredIds.current.has(id) || dismissedIds.current.has(id)) return;
      dismiss(id);
    }, NOTIFICATION_DURATION);
    lifetimeTimers.current.set(id, timer);
  }, [dismiss]);

  const pauseDismissTimer = useCallback((id: string) => {
    if (dismissedIds.current.has(id)) return;
    hoveredIds.current.add(id);
    const timer = lifetimeTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    lifetimeTimers.current.delete(id);
  }, []);

  const resumeDismissTimer = useCallback((id: string) => {
    hoveredIds.current.delete(id);
    if (dismissedIds.current.has(id)) return;
    startDismissTimer(id);
  }, [startDismissTimer]);

  const notify = useCallback((options: NotificationOptions) => {
    const id = `${Date.now()}-${idCounter.current++}`;
    const notification: NotificationItem = { ...options, id };

    setNotifications((current) => [...current, notification]);
    startDismissTimer(id);
  }, [startDismissTimer]);

  useEffect(() => {
    const activeNotifications = notifications.filter((notification) => !notification.isExiting);
    const overflow = activeNotifications.slice(0, Math.max(0, activeNotifications.length - MAX_VISIBLE_NOTIFICATIONS));
    overflow.forEach((notification) => dismiss(notification.id));
  }, [dismiss, notifications]);

  useEffect(() => () => {
    lifetimeTimers.current.forEach((timer) => window.clearTimeout(timer));
    exitTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const isLeft = isCanvasRoute || notifications.some((n) => n.position === "bottom-left");

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <div
        className={`site-notifications ${isLeft ? "site-notifications--left" : ""}`}
        aria-label="Notifications"
        aria-live="polite"
      >
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={dismiss}
            onPause={pauseDismissTimer}
            onResume={resumeDismissTimer}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
