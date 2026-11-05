import React from "react";
import { createRoot } from "react-dom/client";
import ProjectCanvasClient from "../../src/app/dashboard/projects/[slug]/project-canvas-client";
import SharedCanvasViewer from "../../src/components/canvas/shared-canvas-viewer";
import { publicCanvasData } from "../../src/lib/canvas/shared-data";
import { ThemeProvider } from "../../src/lib/theme-context";
import "../../src/app/globals.css";
import { collaborator, currentUser, edges, nodes, project } from "./fixtures.mjs";

// Query options: ?empty (blank canvas), ?shared (public viewer), ?generation=<name>,
// ?user=collab (sign in as a non-owner collaborator) and ?live (load the canvas from the API,
// as the real server-rendered page does, so a refresh shows what was actually persisted).
const params = new URLSearchParams(location.search);
const generation = params.get("generation");
const generated = generation ? await fetch(`/__generation/${generation}`).then(response => response.json()) : null;
const live = params.has("live") ? await fetch(`/api/dashboard/projects/${project.slug}/canvas`, { cache: "no-store" }).then(response => response.json()) : null;
const user = params.get("user") === "collab" ? collaborator : currentUser;
const empty = params.has("empty");

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    {generated ? <SharedCanvasViewer {...publicCanvasData(generated.nodes, generated.edges)} /> : params.has("shared") ? <SharedCanvasViewer {...publicCanvasData(nodes, edges)} /> : <ProjectCanvasClient project={project} initialNodes={live ? live.nodes : empty ? [] : nodes} initialEdges={live ? live.edges : empty ? [] : edges} initialClaimRequests={[]} currentUser={user} isOwner={user.id === project.created_by} />}
  </ThemeProvider>,
);
