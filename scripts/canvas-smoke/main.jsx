import React from "react";
import { createRoot } from "react-dom/client";
import ProjectCanvasClient from "../../src/app/dashboard/projects/[slug]/project-canvas-client";
import { ThemeProvider } from "../../src/lib/theme-context";
import "../../src/app/globals.css";
import { currentUser, edges, nodes, project } from "./fixtures.mjs";

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <ProjectCanvasClient project={project} initialNodes={nodes} initialEdges={edges} initialClaimRequests={[]} currentUser={currentUser} isOwner />
  </ThemeProvider>,
);
