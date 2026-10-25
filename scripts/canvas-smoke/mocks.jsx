import React from "react";

const notify = options => { (window.__canvasSmokeNotifications ??= []).push(options); };
export const useNotifications = () => ({ notify });

export function createClient() {
  const channel = {
    on() { return this; },
    subscribe(callback) { queueMicrotask(() => callback("SUBSCRIBED")); return this; },
    presenceState() { return {}; },
    track() { return Promise.resolve(); },
    send() { return Promise.resolve(); },
  };
  return { channel: () => channel, removeChannel: () => Promise.resolve() };
}

export const canvasSounds = new Proxy({}, { get: () => () => {} });
export default function Link({ children, ...props }) { return <a {...props}>{children}</a>; }
