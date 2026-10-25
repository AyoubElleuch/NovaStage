"use client";

import { useEffect, type RefObject, type KeyboardEvent } from "react";

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]';

export function trapMobilePanelTab(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab" || !window.matchMedia("(max-width: 767px)").matches) return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(item => item.getClientRects().length > 0);
  const first = items[0], last = items[items.length - 1];
  if (!first) return;
  if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}

export function useMobilePanelFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 767px)").matches) return;
    const previous = document.activeElement;
    ref.current?.querySelector<HTMLElement>('button[aria-label^="Close"]')?.focus({ preventScroll: true });
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, [open, ref]);
}
