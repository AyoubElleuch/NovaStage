import React from "react";
import { createRoot } from "react-dom/client";
import ProjectCanvasClient from "../../src/app/dashboard/projects/[slug]/project-canvas-client";
import SharedCanvasViewer from "../../src/components/canvas/shared-canvas-viewer";
import { publicCanvasData } from "../../src/lib/canvas/shared-data";
import { ThemeProvider } from "../../src/lib/theme-context";
import "../../src/app/globals.css";
import { currentUser, edges, nodes, project } from "./fixtures.mjs";

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    {new URLSearchParams(location.search).has("shared") ? <SharedCanvasViewer {...publicCanvasData(nodes, edges)} /> : <ProjectCanvasClient project={project} initialNodes={new URLSearchParams(location.search).has("empty") ? [] : nodes} initialEdges={new URLSearchParams(location.search).has("empty") ? [] : edges} initialClaimRequests={[]} currentUser={currentUser} isOwner />}
  </ThemeProvider>,
);
