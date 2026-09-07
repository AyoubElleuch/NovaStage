"use client";

import { useState } from "react";
import { Check, CheckCircle2, Circle, ListChecks, Rocket } from "lucide-react";
import { canvasSounds } from "@/lib/canvas/sound-effects";

const checkpoints = [
  { title: "API contract approved", owner: "Backend" },
  { title: "Cache failover reviewed", owner: "Platform" },
  { title: "Load test passed", owner: "QA" },
  { title: "Production alerts connected", owner: "SRE" },
];

export default function CardSpecsInspector() {
  const [completed, setCompleted] = useState([true, true, false, false]);
  const completedCount = completed.filter(Boolean).length;
  const toggleCheckpoint = (index: number) => setCompleted((current) => {
    if (!current[index]) canvasSounds.completeTask();
    return current.map((value, itemIndex) => itemIndex === index ? !value : value);
  });

  return <article className="home-feature home-execution-card home-reveal">
    <div className="home-feature-title"><ListChecks size={19} /><h3>Turn the diagram into a delivery plan.</h3></div>
    <p className="home-feature-subtitle">Add checkpoints to any node and make release readiness visible to everyone.</p>
    <div className="home-execution-summary">
      <div><Rocket size={17} /><span>Production gateway</span></div>
      <strong>{completedCount}/{checkpoints.length} ready</strong>
    </div>
    <div className="home-execution-track"><span style={{ width: `${(completedCount / checkpoints.length) * 100}%` }} /></div>
    <div className="home-checkpoint-list">
      {checkpoints.map((checkpoint, index) => <button type="button" key={checkpoint.title} data-complete={completed[index]} onClick={() => toggleCheckpoint(index)}>
        {completed[index] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        <span><strong>{checkpoint.title}</strong><small>{checkpoint.owner}</small></span>
      </button>)}
    </div>
    <div className="home-execution-status" role="status"><Check size={14} /><span>{completedCount === checkpoints.length ? "Release ready. Every checkpoint is complete." : `${checkpoints.length - completedCount} checkpoints remain before release.`}</span></div>
    <p className="home-feature-footnote">Toggle a checkpoint to update progress. The production canvas syncs the same change to every collaborator.</p>
  </article>;
}