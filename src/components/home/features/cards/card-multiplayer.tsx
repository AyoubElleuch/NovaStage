"use client";

import { useState } from "react";
import { Check, LockKeyhole, MousePointer2, Network, Unlock, Users } from "lucide-react";

export default function CardMultiplayer() {
  const [owned, setOwned] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false });
  return <article className="home-feature home-reveal">
    <div className="home-feature-title"><Users size={19} /><h3>Edit together, without collisions.</h3></div>
    <p className="home-feature-subtitle">Live cursors show who is here. Claim locks protect the node being changed.</p>
    <div className="home-presence-demo" data-tracking={pointer.active} onPointerEnter={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top, active: true });
    }} onPointerMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top, active: true });
    }} onPointerLeave={() => setPointer((current) => ({ ...current, active: false }))}>
      <div className="home-presence-resource" data-owned={owned}><Network size={29} /><strong>Production gateway</strong><span>{owned ? <Unlock size={13} /> : <LockKeyhole size={13} />}{owned ? "Editing · You" : "Editing · Sarah"}</span></div>
      <div className="home-demo-cursor home-cursor-sarah"><MousePointer2 size={18} fill="currentColor" /><span>Sarah · DevOps</span></div>
      <div className="home-demo-cursor home-cursor-leo"><MousePointer2 size={18} fill="currentColor" /><span>Leo · Cloud Sec</span></div>
      {pointer.active && <div className="home-demo-cursor home-cursor-you" style={{ transform: `translate3d(${pointer.x}px, ${pointer.y}px, 0)` }}><MousePointer2 size={20} fill="currentColor" /><span>You</span></div>}
    </div>
    <div className="home-presence-action"><span>Simulated team session</span><button type="button" className="home-text-button" onClick={() => setOwned(!owned)}>{owned ? "Release edit" : "Request edit"}{owned ? <Unlock size={15} /> : <LockKeyhole size={15} />}</button></div>
    <p className="home-presence-note" role="status"><Check size={14} />{owned ? "Edit ownership transferred to you." : "Sarah holds the lock. Leo can review."}</p>
  </article>;
}