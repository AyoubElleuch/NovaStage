"use client";

import { useId, useState } from "react";
import { Check, Cloud, Database, Radio, Server, Waypoints } from "lucide-react";

const edgeKinds = {
  dependency: { label: "Dependency", source: "Build API", target: "API Gateway", sourceDetail: "Milestone", targetDetail: "AWS service", transport: "Provisions resource", duration: "1.5s", color: "#94a3b8", dash: "6 4", SourceIcon: Check, TargetIcon: Cloud },
  data_flow: { label: "Data flow", source: "CloudFront", target: "Load balancer", sourceDetail: "HTTPS/443", targetDetail: "HTTP/8080", transport: "Request path", duration: "1.2s", color: "#60a5fa", dash: "8 6", SourceIcon: Cloud, TargetIcon: Server },
  network: { label: "Network", source: "ECS service", target: "PostgreSQL", sourceDetail: "Private subnet", targetDetail: "TCP/5432", transport: "Network route", duration: "1s", color: "#34d399", dash: "4 4", SourceIcon: Server, TargetIcon: Database },
  event: { label: "Event", source: "ECS service", target: "CloudWatch", sourceDetail: "Application", targetDetail: "Logs & metrics", transport: "Async signal", duration: "2.4s", color: "#fbbf24", dash: "8 4 2 4", SourceIcon: Server, TargetIcon: Radio },
};
type EdgeKind = keyof typeof edgeKinds;

export default function CardTopologyEngine() {
  const [edgeKind, setEdgeKind] = useState<EdgeKind>("dependency");
  const routeId = useId();
  const sample = edgeKinds[edgeKind];
  const SourceIcon = sample.SourceIcon;
  const TargetIcon = sample.TargetIcon;
  return <article className="home-feature home-topology-card home-reveal">
    <div className="home-feature-title"><Waypoints size={19} /><h3>Make every connection explain itself.</h3></div>
    <p className="home-feature-subtitle">Model dependencies, data flows, and events with metadata that stays attached.</p>
    <div className="home-segments" role="group" aria-label="Canvas edge type">
      {(Object.keys(edgeKinds) as EdgeKind[]).map((value) => <button type="button" key={value} aria-pressed={edgeKind === value} onClick={() => setEdgeKind(value)}>{edgeKinds[value].label}</button>)}
    </div>
    <div className="home-protocol-diagram">
      <div className="home-diagram-endpoint"><SourceIcon size={28} /><strong>{sample.source}</strong><span>{sample.sourceDetail}</span></div>
      <svg viewBox="0 0 220 90" aria-label={`${sample.label} edge from ${sample.source} to ${sample.target}`}>
        <path id={routeId} d="M5 45C65 45 50 16 110 16S160 45 205 45" fill="none" stroke={sample.color} strokeDasharray={sample.dash} strokeWidth="2" />
        <path d="M205 40L216 45L205 50Z" fill={sample.color} />
        {[0, 0.6, 1.2].map((delay) => <circle className="home-flow-packet" r="3.5" fill="var(--home-accent)" key={`${edgeKind}-${delay}`}>
          <animateMotion dur={sample.duration} begin={`${delay}s`} repeatCount="indefinite"><mpath href={`#${routeId}`} /></animateMotion>
        </circle>)}
      </svg>
      <div className="home-diagram-endpoint"><TargetIcon size={28} /><strong>{sample.target}</strong><span>{sample.targetDetail}</span></div>
    </div>
    <div className="home-protocol-validation" role="status"><Check size={14} />Edge metadata stays attached to the graph</div>
    <div className="home-metric-row"><div><strong>4<small> link types</small></strong><span>Production canvas semantics</span></div><div><strong>{sample.label}<small> edge</small></strong><span>{sample.transport}</span></div></div>
  </article>;
}