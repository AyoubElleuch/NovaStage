import React from "react";
import { createRoot } from "react-dom/client";
import ProjectCanvasClient from "../../src/app/dashboard/projects/[slug]/project-canvas-client";
import SharedCanvasViewer from "../../src/components/canvas/shared-canvas-viewer";
import { publicCanvasData } from "../../src/lib/canvas/shared-data";
import { ThemeProvider } from "../../src/lib/theme-context";
import "../../src/app/globals.css";
import { currentUser, edges, nodes, project } from "./fixtures.mjs";

const generation = new URLSearchParams(location.search).get("generation");
const generated = generation ? await fetch(`/__generation/${generation}`).then(response => response.json()) : null;

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    {generated ? <SharedCanvasViewer {...publicCanvasData(generated.nodes, generated.edges)} /> : new URLSearchParams(location.search).has("shared") ? <SharedCanvasViewer {...publicCanvasData(nodes, edges)} /> : <ProjectCanvasClient project={project} initialNodes={new URLSearchParams(location.search).has("empty") ? [] : nodes} initialEdges={new URLSearchParams(location.search).has("empty") ? [] : edges} initialClaimRequests={[]} currentUser={currentUser} isOwner />}
  </ThemeProvider>,
);
