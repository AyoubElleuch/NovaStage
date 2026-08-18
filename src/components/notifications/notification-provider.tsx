"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Copy, X } from "lucide-react";

const MAX_VISIBLE_NOTIFICATIONS = 2;
const NOTIFICATION_DURATION = 3000;
const EXIT_DURATION = 220;

type NotificationTone = "success" | "error";

export interface NotificationOptions {
  tone?: NotificationTone;
  title: string;
  message?: string;
  detail?: string;
  copyText?: string;
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
  const Icon = notification.tone === "error" ? AlertCircle : CheckCircle2;

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
      className={`site-notification site-notification--${notification.tone || "success"} ${notification.isExiting ? "site-notification--exiting" : ""}`}
      role={notification.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => onPause(notification.id)}
      onMouseLeave={() => onResume(notification.id)}
    >
      <Icon className="site-notification__icon" aria-hidden="true" />
      <div className="site-notification__content">
        <strong>{notification.title}</strong>
        {notification.message && <p>{notification.message}</p>}
        {notification.detail && (
          <div className="site-notification__detail">
            <span>{notification.detail}</span>
            {notification.copyText && (
              <button type="button" onClick={handleCopy} className="site-notification__copy" title="Copy notification detail">
                {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {isCopied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        className="site-notification__dismiss"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
        title="Dismiss notification"
      >
        <X aria-hidden="true" />
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

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="site-notifications" aria-label="Notifications" aria-live="polite">
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
