import React from "react";

const notify = options => { (window.__canvasSmokeNotifications ??= []).push(options); };
export const useNotifications = () => ({ notify });

// Realtime fixture: pages of one browser context share a BroadcastChannel, so two tabs collaborate
// the way two clients on one Supabase Realtime channel do. `window.__canvasSmokeRealtime` lets a test
// drop and restore the connection; messages sent while it is down are lost, as in production.
function createChannel(name, options) {
  const key = options?.config?.presence?.key || crypto.randomUUID();
  const bus = new BroadcastChannel(`canvas-smoke:${name}`);
  const listeners = [];
  const peers = new Map();
  let tracked = null;
  let statusCallback = null;
  let connected = true;
  const emitPresence = () => listeners.filter(item => item.type === "presence").forEach(item => item.callback());
  bus.onmessage = ({ data }) => {
    if (!connected || data.from === key) return;
    if (data.kind === "broadcast") listeners.filter(item => item.type === "broadcast" && item.event === data.event).forEach(item => item.callback({ payload: data.payload }));
    if (data.kind === "presence") { if (data.state) peers.set(data.from, data.state); else peers.delete(data.from); emitPresence(); }
    if (data.kind === "hello" && tracked) bus.postMessage({ kind: "presence", from: key, state: tracked });
  };
  const channel = {
    on(type, filter, callback) { listeners.push({ type, event: filter?.event, callback }); return channel; },
    subscribe(callback) {
      statusCallback = callback;
      queueMicrotask(() => { callback("SUBSCRIBED"); bus.postMessage({ kind: "hello", from: key }); });
      return channel;
    },
    presenceState() {
      const state = {};
      if (tracked) state[key] = [tracked];
      for (const [peer, value] of peers) state[peer] = [value];
      return state;
    },
    async track(state) { tracked = state; if (connected) bus.postMessage({ kind: "presence", from: key, state }); emitPresence(); },
    async send({ event, payload }) { if (connected) bus.postMessage({ kind: "broadcast", from: key, event, payload }); },
    close() { bus.postMessage({ kind: "presence", from: key, state: null }); bus.close(); },
  };
  (window.__canvasSmokeChannels ??= []).push({
    drop() { connected = false; statusCallback?.("CHANNEL_ERROR"); },
    restore() { connected = true; statusCallback?.("SUBSCRIBED"); bus.postMessage({ kind: "hello", from: key }); },
  });
  return channel;
}

window.__canvasSmokeRealtime = {
  drop: () => window.__canvasSmokeChannels?.forEach(channel => channel.drop()),
  restore: () => window.__canvasSmokeChannels?.forEach(channel => channel.restore()),
};

export function createClient() {
  return { channel: (name, options) => createChannel(name, options), removeChannel: channel => { channel?.close?.(); return Promise.resolve(); } };
}

export const canvasSounds = new Proxy({}, { get: () => () => {} });
export const usePathname = () => (typeof window !== "undefined" ? window.location.pathname : "/");
export default function Link({ children, ...props }) { return <a {...props}>{children}</a>; }
