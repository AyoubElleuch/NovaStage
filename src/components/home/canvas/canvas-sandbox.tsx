"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Maximize2, Minimize2, RotateCcw, Trash2 } from "lucide-react";
import dagre from "@dagrejs/dagre";
import CanvasViewportContainer from "@/components/canvas/canvas-viewport";
import CanvasNodeComponent from "@/components/canvas/canvas-node";
import CanvasEdgeLayer from "@/components/canvas/canvas-edge-layer";
import CanvasDock from "@/components/canvas/canvas-dock";
import CanvasDrawer from "@/components/canvas/canvas-drawer";
import CanvasReleasePulse from "@/components/canvas/canvas-release-pulse";
import CanvasServicePalette from "@/components/canvas/canvas-service-palette";
import { AWS_SERVICE_REGISTRY } from "@/components/canvas/aws-icons";
import { getNodeHandlePosition } from "@/lib/canvas/coordinate-math";
import type { CanvasNode, CanvasTool, CanvasViewport, HandlePosition } from "@/lib/canvas/types";
import { canvasSounds } from "@/lib/canvas/sound-effects";
import { connectNodes, createGroup, createInitialGraph, createMilestone, createService, deleteNodes, initialHistory, moveNode, sandboxReducer, VISITOR_ID } from "./sandbox-state";
import CanvasAssemblyAnimation from "./canvas-assembly-animation";
import CanvasPacketLayer from "./canvas-packet-layer";

export default function CanvasSandbox({ active, interactive = true }: { active: boolean; interactive?: boolean }) {
  const [history, dispatch] = useReducer(sandboxReducer, undefined, initialHistory);
  const graph = history.present;
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 30, y: 30, zoom: 0.8 });
  const [tool, setTool] = useState<CanvasTool>("select");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [snap, setSnap] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [compact, setCompact] = useState(false);
  const compactRef = useRef<boolean | null>(null);
  const [selectionMarquee, setSelectionMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const selectionMarqueeRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [isServicePaletteOpen, setIsServicePaletteOpen] = useState(false);
  const [isReleasePulseOpen, setIsReleasePulseOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [link, setLink] = useState<{ source: string; handle: HandlePosition } | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const hostRef = useRef<HTMLDivElement>(null);
  const sandboxRef = useRef<HTMLDivElement>(null);
  const [sandboxElement, setSandboxElement] = useState<HTMLDivElement | null>(null);
  const setSandboxRef = useCallback((node: HTMLDivElement | null) => {
    sandboxRef.current = node;
    setSandboxElement(node);
  }, []);
  const dragRef = useRef<{ id: string; x: number; y: number; screenX: number; screenY: number; selected: Set<string>; initial: Map<string, { x: number; y: number }> } | null>(null);
  const graphRef = useRef(graph);
  useEffect(() => { graphRef.current = graph; }, [graph]);

  function fitView() {
    const host = hostRef.current;
    if (!host) return;
    const nextCompact = host.clientWidth < 700;
    if (compactRef.current !== nextCompact) {
      compactRef.current = nextCompact;
      setCompact(nextCompact);
      const seed = createInitialGraph(nextCompact);
      const responsive = { ...graphRef.current,
        nodes: graphRef.current.nodes.map((node) => {
          const position = seed.nodes.find((item) => item.id === node.id);
          return position ? { ...node, position_x: position.position_x, position_y: position.position_y } : node;
        }),
        edges: graphRef.current.edges.map((edge) => {
          const initial = seed.edges.find((item) => item.id === edge.id);
          return initial ? { ...edge, source_handle: initial.source_handle, target_handle: initial.target_handle } : edge;
        }),
      };
      graphRef.current = responsive;
      dispatch({ type: "preview", graph: responsive });
    }
    const nodes = graphRef.current.nodes;
    if (!nodes.length) {
      setViewport({ x: host.clientWidth / 2, y: host.clientHeight / 2, zoom: 1 });
      return;
    }
    const minX = Math.min(...nodes.map((node) => node.position_x));
    const minY = Math.min(...nodes.map((node) => node.position_y));
    const width = Math.max(...nodes.map((node) => node.position_x + node.width)) - minX;
    const height = Math.max(...nodes.map((node) => node.position_y + node.height)) - minY + 90;
    const zoom = Math.max(0.15, Math.min((host.clientWidth - 50) / width, (host.clientHeight - 115) / height, 1));
    setViewport({ zoom, x: (host.clientWidth - width * zoom) / 2 - minX * zoom, y: (host.clientHeight - height * zoom - 55) / 2 - minY * zoom });
  }

  useEffect(() => {
    const observer = new ResizeObserver(fitView);
    if (hostRef.current) observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  function startDrag(node: CanvasNode, event: PointerEvent) {
    if (tool === "hand") return;
    dispatch({ type: "checkpoint" });
    const ids = selectedNodeIds.has(node.id) && selectedNodeIds.size > 1 ? new Set(selectedNodeIds) : new Set([node.id]);
    const initial = new Map<string, { x: number; y: number }>();
    ids.forEach((id) => {
      const target = graph.nodes.find((item) => item.id === id);
      if (target) initial.set(id, { x: target.position_x, y: target.position_y });
    });
    dragRef.current = { id: node.id, x: node.position_x, y: node.position_y, screenX: event.clientX, screenY: event.clientY, selected: ids, initial };
    setDragging(true);
  }

  function move(event: PointerEvent) {
    const drag = dragRef.current;
    const host = hostRef.current;
    if (!drag || !host) return;
    const frameScale = host.getBoundingClientRect().width / host.clientWidth;
    const deltaX = (event.clientX - drag.screenX) / viewport.zoom / frameScale;
    const deltaY = (event.clientY - drag.screenY) / viewport.zoom / frameScale;
    let next = graph;
    drag.selected.forEach((id) => {
      const initial = drag.initial.get(id);
      if (initial) next = moveNode(next, id, initial.x + deltaX, initial.y + deltaY, snap);
    });
    dispatch({ type: "preview", graph: next });
  }

  function endDrag() { dragRef.current = null; setDragging(false); }

  function startLink(node: CanvasNode, handle: HandlePosition) {
    if (!link) { setLink({ source: node.id, handle }); setPointer(getNodeHandlePosition(node, handle)); return; }
    const next = connectNodes(graph, link.source, node.id, link.handle, handle);
    if (next !== graph) {
      canvasSounds.link();
      dispatch({ type: "commit", graph: next });
    }
    setLink(null);
  }

  function updateNode(id: string, updates: Partial<CanvasNode>) {
    dispatch({ type: "commit", graph: { ...graph, nodes: graph.nodes.map((node) => node.id === id ? { ...node, ...updates } : node) } });
  }

  function toggleCheckpoint(checkpointId: string, nodeId: string, nextCompleted: boolean) {
    const target = graph.nodes.find((node) => node.id === nodeId);
    if (!target) return;
    if (nextCompleted) canvasSounds.completeTask();
    updateNode(nodeId, { checkpoints: target.checkpoints.map((checkpoint) => checkpoint.id === checkpointId ? { ...checkpoint, is_completed: nextCompleted } : checkpoint) });
  }

  function selectNode(node: CanvasNode, isShiftKey = false) {
    if (isShiftKey) {
      setSelectedNodeIds((current) => {
        const next = new Set(current);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
      setSelectedNodeId(node.id);
      return;
    }
    setSelectedNodeId(node.id);
    setSelectedNodeIds(new Set([node.id]));
  }

  const deleteSelectedNodes = useCallback(() => {
    const ids = new Set(selectedNodeIds);
    if (selectedNodeId) ids.add(selectedNodeId);
    if (!ids.size) return;
    canvasSounds.deleteNode();
    dispatch({ type: "commit", graph: deleteNodes(graph, ids) });
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
    setLink(null);
  }, [graph, selectedNodeId, selectedNodeIds]);

  function updateMarquee(startX: number, startY: number, currentX: number, currentY: number) {
    const minX = Math.min(startX, currentX);
    const maxX = Math.max(startX, currentX);
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);
    const inside = new Set(graph.nodes.filter((node) => {
      const right = node.position_x + node.width;
      const bottom = node.position_y + node.height;
      return node.position_x < maxX && right > minX && node.position_y < maxY && bottom > minY;
    }).map((node) => node.id));
    setSelectedNodeIds(inside);
    setSelectedNodeId(inside.size === 1 ? [...inside][0] : null);
  }

  function addMilestone() {
    const node = createMilestone(crypto.randomUUID(), `Milestone Step ${graph.nodes.length + 1}`, (150 - viewport.x) / viewport.zoom, (120 - viewport.y) / viewport.zoom);
    dispatch({ type: "commit", graph: { ...graph, nodes: [...graph.nodes, node] } });
    canvasSounds.addNode();
    setSelectedNodeId(node.id);
    setSelectedNodeIds(new Set([node.id]));
  }

  function addAWSService(serviceId: string) {
    const service = AWS_SERVICE_REGISTRY[serviceId];
    if (!service) return;
    const node = { ...createService(crypto.randomUUID(), service.name, serviceId, (400 - viewport.x) / viewport.zoom, (250 - viewport.y) / viewport.zoom), claimed_by: VISITOR_ID, claim_holder: { id: VISITOR_ID, fullName: "You" } };
    dispatch({ type: "commit", graph: { ...graph, nodes: [...graph.nodes, node] } });
    canvasSounds.addNode();
    setSelectedNodeId(node.id);
    setSelectedNodeIds(new Set([node.id]));
    setIsServicePaletteOpen(false);
  }

  function addGroup() {
    const node = createGroup(crypto.randomUUID(), (350 - viewport.x) / viewport.zoom, (200 - viewport.y) / viewport.zoom);
    dispatch({ type: "commit", graph: { ...graph, nodes: [...graph.nodes, node] } });
    canvasSounds.addNode();
    setSelectedNodeId(node.id);
    setSelectedNodeIds(new Set([node.id]));
  }

  function claimNode(id: string) {
    updateNode(id, { claimed_by: VISITOR_ID, claim_holder: { id: VISITOR_ID, fullName: "You" } });
  }

  function releaseNode(id: string) { updateNode(id, { claimed_by: null, claim_holder: null }); }

  function tidy() {
    const layout = new dagre.graphlib.Graph().setGraph({ rankdir: "LR", nodesep: 90, ranksep: 110 }).setDefaultEdgeLabel(() => ({}));
    graph.nodes.forEach((node) => layout.setNode(node.id, { width: node.width, height: node.height }));
    graph.edges.forEach((edge) => layout.setEdge(edge.source_node_id, edge.target_node_id));
    dagre.layout(layout);
    const next = { ...graph, nodes: graph.nodes.map((node) => {
      const position = layout.node(node.id);
      return { ...node, position_x: position.x - node.width / 2 + 50, position_y: position.y - node.height / 2 + 70 };
    }) };
    graphRef.current = next;
    dispatch({ type: "commit", graph: next });
    fitView();
  }

  function zoomBy(factor: number) {
    const host = hostRef.current;
    if (!host) return;
    const zoom = Math.min(2.5, Math.max(0.15, viewport.zoom * factor));
    setViewport({ zoom, x: host.clientWidth / 2 - (host.clientWidth / 2 - viewport.x) * zoom / viewport.zoom,
      y: host.clientHeight / 2 - (host.clientHeight / 2 - viewport.y) * zoom / viewport.zoom });
  }

  function addCheckpoint(nodeId: string, title: string) {
    const node = graph.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    updateNode(nodeId, { checkpoints: [...node.checkpoints, {
      id: crypto.randomUUID(), node_id: nodeId, project_id: "homepage-sandbox", title,
      is_completed: false, sort_order: node.checkpoints.length,
    }] });
  }

  function deleteCheckpoint(checkpointId: string, nodeId: string) {
    const node = graph.nodes.find((item) => item.id === nodeId);
    if (node) updateNode(nodeId, { checkpoints: node.checkpoints.filter((checkpoint) => checkpoint.id !== checkpointId) });
  }

  function deleteEdge(edgeId: string) {
    const nextEdges = graph.edges.filter((edge) => edge.id !== edgeId);
    if (nextEdges.length === graph.edges.length) return;
    canvasSounds.deleteNode();
    dispatch({ type: "commit", graph: { ...graph, edges: nextEdges } });
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, button, a, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        setSelectedNodeId(null); setSelectedNodeIds(new Set()); setLink(null); setIsServicePaletteOpen(false); setIsReleasePulseOpen(false);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault(); setSelectedNodeIds(new Set(graph.nodes.map((node) => node.id))); setSelectedNodeId(null);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNodeIds.size || selectedNodeId) { event.preventDefault(); deleteSelectedNodes(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedNodes, graph.nodes, selectedNodeId, selectedNodeIds]);

  function toggleExpanded() { setIsExpanded((current) => !current); }

  const sourceNode = graph.nodes.find((node) => node.id === link?.source);
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedCount = selectedNodeIds.size || (selectedNodeId ? 1 : 0);
  return <div ref={setSandboxRef} className="home-sandbox" data-expanded={isExpanded} data-testid="home-sandbox">
    <div className="home-canvas-bar">
      <div className="home-canvas-bar-actions"><button type="button" className="home-icon-button" title="Reset sandbox" aria-label="Reset sandbox" onClick={() => {
        const initial = initialHistory(); graphRef.current = initial.present; compactRef.current = null;
        dispatch({ type: "reset" }); setSelectedNodeId(null); setSelectedNodeIds(new Set()); setLink(null); setIsServicePaletteOpen(false); fitView();
      }}><RotateCcw size={16} /></button><button type="button" className="home-icon-button" title={isExpanded ? "Collapse canvas" : "Expand canvas"} aria-label={isExpanded ? "Collapse canvas" : "Expand canvas"} onClick={toggleExpanded}>{isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button></div>
    </div>
    <div ref={hostRef} className="home-canvas-viewport" data-tool={tool} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag}
      onKeyDown={(event) => { if (event.key === "Escape") setLink(null); }}
      onWheelCapture={(event) => { if (!event.ctrlKey && !event.metaKey && tool !== "hand") event.stopPropagation(); }}>
      <CanvasViewportContainer viewport={viewport} onViewportChange={setViewport} activeTool={tool} isDraggingNode={dragging} selectionMarquee={selectionMarquee}
        onPointerMove={(world) => {
          setPointer(world);
        }} onCanvasClick={() => { setSelectedNodeId(null); setSelectedNodeIds(new Set()); setLink(null); }}
        onMarqueeStart={(world) => { const next = { startX: world.x, startY: world.y, currentX: world.x, currentY: world.y }; selectionMarqueeRef.current = next; setSelectionMarquee(next); setSelectedNodeId(null); setSelectedNodeIds(new Set()); }}
        onMarqueeChange={(world) => { const current = selectionMarqueeRef.current; if (!current) return; current.currentX = world.x; current.currentY = world.y; setSelectionMarquee({ ...current }); updateMarquee(current.startX, current.startY, world.x, world.y); }}
        onMarqueeEnd={() => { selectionMarqueeRef.current = null; setSelectionMarquee(null); }}>
        <div className="home-assembled-edges">
          <CanvasEdgeLayer onUpdateEdge={async (edgeId, updates) => { dispatch({ type: "commit", graph: { ...graph, edges: graph.edges.map((edge) => edge.id === edgeId ? { ...edge, ...updates } : edge) } }); }} nodes={graph.nodes} edges={graph.edges} draftEdge={sourceNode && link ? { sourceNode, sourceHandle: link.handle, currentPos: pointer } : null}
            currentUserId={VISITOR_ID} isOwner onDeleteEdge={deleteEdge} />
          <CanvasPacketLayer nodes={graph.nodes} edges={graph.edges} active={active} />
        </div>
        {graph.nodes.map((node, index) => <div className="home-assembled-node" key={node.id} data-node-id={node.id} style={{ "--node-order": Math.min(index, 4) } as CSSProperties}>
          <CanvasNodeComponent node={node} stepIndex={index} isSelected={selectedNodeId === node.id} isMultiSelected={selectedNodeIds.has(node.id)} isLinking={Boolean(link)}
            currentUserId={VISITOR_ID} onSelect={selectNode} onDragStart={startDrag} onDragEnd={endDrag}
            onStartLink={startLink} onToggleCheckpoint={toggleCheckpoint}
            onRequestClaim={(target) => claimNode(target.id)}
            onClaimNode={claimNode} onUpdateTitle={(id, title) => updateNode(id, { title })} zoom={viewport.zoom} />
        </div>)}
        <CanvasAssemblyAnimation active={active} compact={compact} />
      </CanvasViewportContainer>
      {selectedCount > 0 && <div className="home-selection-actions"><span>{selectedCount} selected</span><button type="button" title="Delete selected" aria-label="Delete selected" onClick={deleteSelectedNodes}><Trash2 size={15} /></button></div>}
      <div className="home-dock-position">
        <CanvasDock className="home-production-dock" activeTool={tool} onSelectTool={setTool} viewport={viewport}
          onZoomIn={() => zoomBy(1.2)} onZoomOut={() => zoomBy(1 / 1.2)} onResetZoom={() => zoomBy(1 / viewport.zoom)} onFitView={fitView}
          onAddNode={addMilestone} onAddGroup={addGroup} onTidyLayout={tidy} snapGrid={snap} onToggleSnapGrid={() => setSnap(!snap)}
          canUndo={history.past.length > 0} canRedo={history.future.length > 0}
          onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })}
          isReleasePulseOpen={isReleasePulseOpen} onToggleReleasePulse={() => setIsReleasePulseOpen((current) => !current)}
          onToggleServicePalette={() => setIsServicePaletteOpen((current) => !current)} />
      </div>
      <CanvasServicePalette isOpen={isServicePaletteOpen} onClose={() => setIsServicePaletteOpen(false)} onAddService={addAWSService} />
      {interactive && isReleasePulseOpen && <CanvasReleasePulse portalContainer={sandboxElement} nodes={graph.nodes} edges={graph.edges} onClose={() => setIsReleasePulseOpen(false)} onJumpToNode={(id) => { const target = graph.nodes.find((node) => node.id === id); if (target) { selectNode(target); setViewport((current) => ({ ...current, x: hostRef.current ? hostRef.current.clientWidth / 2 - (target.position_x + target.width / 2) * current.zoom : current.x, y: hostRef.current ? hostRef.current.clientHeight / 2 - (target.position_y + target.height / 2) * current.zoom : current.y })); } }} />}
    </div>
    {interactive && selectedNode && <CanvasDrawer node={selectedNode} allNodes={graph.nodes} edges={graph.edges} currentUserId={VISITOR_ID} isProjectOwner onClose={() => { setSelectedNodeId(null); }}
      onUpdateNode={updateNode} onDeleteNode={(id) => { canvasSounds.deleteNode(); setSelectedNodeId(null); setSelectedNodeIds(new Set()); dispatch({ type: "commit", graph: deleteNodes(graph, new Set([id])) }); }}
    onToggleCheckpoint={toggleCheckpoint}
      onAddCheckpoint={addCheckpoint} onDeleteCheckpoint={deleteCheckpoint} onClaimNode={claimNode} onReleaseNode={releaseNode} onRequestClaim={(node) => claimNode(node.id)} onForceUnlock={releaseNode}
      onJumpToNode={(id) => { const target = graph.nodes.find((node) => node.id === id); if (target) selectNode(target); }} />}
  </div>;
}