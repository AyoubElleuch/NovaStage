// A disposable, stateful stand-in for the canvas API routes, for isolated browser and manual review.
// It mirrors the real routes' authorization rules (claims, ownership, response shapes) so persistence,
// conflicts and failures behave realistically. It is a MODEL of the contract: passing against it
// does not prove live production behavior (see docs/canvas-reliability.md).
export const OWNER = { id: "smoke-user", fullName: "Canvas Tester", email: "canvas-smoke@example.test" };
export const COLLABORATOR = { id: "collab-user", fullName: "Casey Collaborator", email: "casey@example.test" };
const PROFILES = { [OWNER.id]: OWNER, [COLLABORATOR.id]: COLLABORATOR };
const CLAIM_MS = 5 * 60 * 1000;
const CONTENT_FIELDS = ["title", "description", "status", "color", "aws_metadata", "group_metadata", "annotation_metadata"];
const UPDATE_FIELDS = [...CONTENT_FIELDS, "position_x", "position_y", "width", "height", "node_type", "parent_group_id"];
const clone = value => structuredClone(value);

export function createApiModel({ nodes = [], edges = [], projectId = "canvas-smoke" } = {}) {
  const model = {
    nodes: clone(nodes), edges: clone(edges), claimRequests: [], shareToken: null,
    requests: [], failures: [], skew: 0, latencyMs: 0, counter: 0, ownerId: OWNER.id,
  };
  const now = () => Date.now() + model.skew;
  const id = prefix => `${prefix}-${++model.counter}`;
  const iso = ms => new Date(ms).toISOString();
  const isLive = node => Boolean(node.claimed_by) && (!node.claim_expires_at || Date.parse(node.claim_expires_at) > now());
  const holder = userId => (PROFILES[userId] ? { ...PROFILES[userId] } : { id: userId, fullName: "Collaborator", email: "" });
  const view = node => {
    const live = isLive(node);
    return { ...clone(node), claimed_by: live ? node.claimed_by : null, claim_expires_at: live ? node.claim_expires_at : null, claim_holder: live ? holder(node.claimed_by) : null };
  };
  const owns = (node, user) => isLive(node) && node.claimed_by === user.id;
  const find = nodeId => model.nodes.find(node => node.id === nodeId);
  const reply = (json, status = 200) => ({ status, json });

  // Seed claims with a long lease so fixtures stay editable without a heartbeat.
  for (const node of model.nodes) {
    if (node.claimed_by && !node.claim_expires_at) node.claim_expires_at = iso(now() + 365 * 24 * 3600 * 1000);
  }

  function canvasAction(body, user) {
    const isOwner = user.id === model.ownerId;
    switch (body.action) {
      case "create_node": {
        if (find(body.id)) return reply({ success: false, error: "Unable to create this item. Please try again." }, 500);
        const type = body.node_type || "milestone";
        const node = {
          id: body.id || id("node"), project_id: projectId, title: body.title || (type === "group" ? "New Group" : "New Milestone"),
          description: body.description || "", status: "draft", position_x: body.position_x ?? 100, position_y: body.position_y ?? 100,
          width: body.width || (type === "aws_service" ? 200 : type === "group" ? 400 : 280), height: body.height || (type === "aws_service" ? 140 : type === "group" ? 300 : 170),
          color: "default", sort_order: model.nodes.length, claimed_by: user.id, claim_expires_at: iso(now() + CLAIM_MS), version: 1,
          node_type: type, aws_metadata: body.aws_metadata || null, group_metadata: body.group_metadata || null,
          annotation_metadata: body.annotation_metadata || null, parent_group_id: body.parent_group_id || null,
          checkpoints: (body.checkpoints || []).map((title, index) => ({ id: id("cp"), node_id: body.id, project_id: projectId, title, is_completed: false, sort_order: index })),
        };
        model.nodes.push(node);
        return reply({ success: true, node: view(node) });
      }
      case "update_node": {
        const node = find(body.node_id);
        if (!node) return reply({ success: false, error: "Node not found" });
        const updates = body.updates || {};
        if (CONTENT_FIELDS.some(field => updates[field] !== undefined) && !owns(node, user)) {
          return reply({ success: false, error: "You must claim this milestone box to edit its content" });
        }
        for (const field of UPDATE_FIELDS) if (updates[field] !== undefined) node[field] = updates[field];
        node.version += 1;
        return reply({ success: true });
      }
      case "delete_node": {
        const node = find(body.node_id);
        if (!isOwner && node && node.claimed_by !== user.id) return reply({ success: false, error: "You must claim this milestone box to delete it" });
        model.nodes = model.nodes.filter(item => item.id !== body.node_id);
        model.edges = model.edges.filter(edge => edge.source_node_id !== body.node_id && edge.target_node_id !== body.node_id);
        return reply({ success: true });
      }
      case "create_edge": {
        const ends = [find(body.source_node_id), find(body.target_node_id)];
        if (body.source_node_id === body.target_node_id || ends.some(end => !end)) return reply({ success: false, edge: null });
        if (!isOwner && ends.every(end => !end.node_type || end.node_type === "milestone") && ends.every(end => end.claimed_by) && !ends.some(end => owns(end, user))) {
          return reply({ success: false, edge: null });
        }
        const handles = { source_handle: body.source_handle || "right", target_handle: body.target_handle || "left" };
        let edge = model.edges.find(item => item.source_node_id === body.source_node_id && item.target_node_id === body.target_node_id && item.source_handle === handles.source_handle && item.target_handle === handles.target_handle);
        if (!edge) {
          edge = { id: id("edge"), project_id: projectId, source_node_id: body.source_node_id, target_node_id: body.target_node_id, ...handles, edge_type: body.edge_type || "dependency", label: null };
          model.edges.push(edge);
        }
        return reply({ success: true, edge: clone(edge) });
      }
      case "update_edge": {
        const edge = model.edges.find(item => item.id === body.edge_id);
        if (!edge) return reply({ success: false, error: "Connection not found" }, 400);
        const ends = [find(edge.source_node_id), find(edge.target_node_id)].filter(Boolean);
        if (!isOwner && !ends.some(end => owns(end, user))) return reply({ success: false, error: "Claim a connected resource before editing its connection" }, 400);
        Object.assign(edge, { label: String(body.updates?.label ?? "").trim() || null, edge_type: body.updates?.edge_type || edge.edge_type });
        return reply({ success: true, edge: clone(edge) });
      }
      case "delete_edge": {
        const edge = model.edges.find(item => item.id === body.edge_id);
        if (edge && !isOwner && ![find(edge.source_node_id), find(edge.target_node_id)].some(end => end && owns(end, user))) return reply({ success: false });
        model.edges = model.edges.filter(item => item.id !== body.edge_id);
        return reply({ success: true });
      }
      default: return reply({ error: "Invalid action" }, 400);
    }
  }

  function checkpointAction(body, user) {
    let node = find(body.node_id);
    let checkpoint = node?.checkpoints.find(item => item.id === body.checkpoint_id);
    if (body.checkpoint_id) {
      checkpoint = model.nodes.flatMap(item => item.checkpoints).find(item => item.id === body.checkpoint_id);
      if (!checkpoint) return body.action === "delete" ? reply({ success: true }) : reply({ error: "Checkpoint not found" }, 404);
      if (body.node_id && checkpoint.node_id !== body.node_id) return reply({ error: "Checkpoint does not belong to this milestone" }, 400);
      node = find(checkpoint.node_id);
    }
    if (!node) return reply({ error: "A milestone is required" }, 400);
    if (!owns(node, user)) return reply({ error: "You must claim this milestone box to alter or check its steps" }, 423);
    switch (body.action) {
      case "toggle": {
        checkpoint.is_completed = Boolean(body.is_completed);
        const all = node.checkpoints.every(item => item.is_completed);
        node.status = all ? "completed" : node.checkpoints.some(item => item.is_completed) ? "in_progress" : "draft";
        return reply({ success: true, checkpoint: clone(checkpoint), newStatus: node.status });
      }
      case "add": {
        const created = { id: id("cp"), node_id: node.id, project_id: projectId, title: body.title || "New Checkpoint", is_completed: false, sort_order: node.checkpoints.length };
        node.checkpoints.push(created);
        return reply({ success: true, checkpoint: clone(created) });
      }
      case "edit": checkpoint.title = body.title; return reply({ success: true, checkpoint: clone(checkpoint) });
      case "delete": node.checkpoints = node.checkpoints.filter(item => item.id !== checkpoint.id); return reply({ success: true });
      default: return reply({ error: "Invalid action" }, 400);
    }
  }

  function claimAction(body, user) {
    const isOwner = user.id === model.ownerId;
    const node = find(body.node_id);
    switch (body.action) {
      case "claim":
        if (!node || (isLive(node) && node.claimed_by !== user.id)) return reply({ success: false, error: "Box is currently claimed by another collaborator" });
        Object.assign(node, { claimed_by: user.id, claim_expires_at: iso(now() + CLAIM_MS) });
        return reply({ success: true, expiresAt: node.claim_expires_at });
      case "release":
        if (node?.claimed_by === user.id) Object.assign(node, { claimed_by: null, claim_expires_at: null });
        return reply({ success: true });
      case "heartbeat":
        if (node?.claimed_by === user.id) {
          node.claim_expires_at = iso(now() + CLAIM_MS);
          return reply({ success: true, expiresAt: node.claim_expires_at });
        }
        return reply({ success: false, error: "You no longer hold this claim" });
      case "request_claim": {
        if (!node || !isLive(node)) return claimAction({ ...body, action: "claim" }, user);
        if (node.claimed_by === user.id) return reply({ success: true, message: "You already own this claim" });
        const request = { id: id("claim-request"), project_id: projectId, node_id: node.id, requester_id: user.id, current_holder_id: node.claimed_by, status: "pending" };
        model.claimRequests.push(request);
        return reply({ success: true, request, current_holder_id: node.claimed_by, node_title: node.title });
      }
      case "resolve_claim": {
        const request = model.claimRequests.find(item => item.id === body.request_id);
        if (!request || request.status !== "pending") return reply({ error: "Claim request expired or invalid" }, 400);
        if (request.current_holder_id !== user.id && !isOwner) return reply({ error: "Not authorized to resolve this request" }, 403);
        request.status = body.accept ? "granted" : "declined";
        if (body.accept) Object.assign(find(request.node_id), { claimed_by: request.requester_id, claim_expires_at: iso(now() + CLAIM_MS) });
        return reply({ success: true, status: request.status });
      }
      case "force_unlock":
        if (!isOwner) return reply({ error: "Only project owners can force unlock nodes" }, 403);
        if (node) Object.assign(node, { claimed_by: null, claim_expires_at: null });
        return reply({ success: true, unlocked: true });
      default: return reply({ error: "Invalid action" }, 400);
    }
  }

  /** Handles one request. `user` is the signed-in profile; `null` simulates a signed-out or removed member. */
  async function handle({ method, pathname, body = {}, user }) {
    model.requests.push({ method, pathname, body, user: user?.id ?? null });
    if (model.latencyMs) await new Promise(done => setTimeout(done, model.latencyMs));
    const index = model.failures.findIndex(failure => failure.matches({ method, pathname, body, user }));
    if (index >= 0) {
      const failure = model.failures[index];
      if (failure.once !== false) model.failures.splice(index, 1);
      return failure.response;
    }
    if (pathname === "/api/ping") return { status: 204 };
    if (!user) return reply({ error: "Unauthorized" }, 401);
    if (user.member === false) return reply({ error: "Forbidden" }, 403);
    if (pathname.endsWith("/share")) {
      if (method === "POST") model.shareToken ||= "a".repeat(64);
      if (method === "DELETE") model.shareToken = null;
      return reply({ token: model.shareToken });
    }
    if (method === "GET") return reply({ project: { id: projectId, slug: projectId, name: "Launch workspace" }, nodes: model.nodes.map(view), edges: clone(model.edges), claimRequests: [] });
    if (method !== "POST") return reply({ error: "Method not allowed" }, 405);
    if (pathname.endsWith("/canvas/checkpoints")) return checkpointAction(body, user);
    if (pathname.endsWith("/canvas/claim")) return claimAction(body, user);
    if (pathname.endsWith("/canvas")) return canvasAction(body, user);
    return reply({ error: "Not found" }, 404);
  }

  return Object.assign(model, {
    handle,
    advance(ms) { model.skew += ms; },
    now,
    /** Fail the next matching request once (or every time with `once: false`) with a JSON response or a network error. */
    fail(matches, response = { status: 500, json: { error: "Injected server failure" } }, { once = true } = {}) {
      model.failures.push({ matches: typeof matches === "string" ? request => request.pathname.endsWith(matches) || request.body?.action === matches : matches, response, once });
    },
    clearFailures() { model.failures = []; },
    stored(nodeId) { return find(nodeId); },
    mutations() { return model.requests.filter(request => request.method === "POST"); },
  });
}

/** Routes a Playwright page's API traffic through the model for one signed-in user. */
export async function routeModel(page, model, { origin, user = OWNER, allowExternal = false } = {}) {
  const session = { current: user };
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return allowExternal ? route.continue() : route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const body = request.method() === "POST" ? request.postDataJSON() : {};
    const result = await model.handle({ method: request.method(), pathname: url.pathname, body, user: session.current });
    if (result.network) return route.abort("failed");
    return result.status === 204 ? route.fulfill({ status: 204 }) : route.fulfill({ status: result.status, json: result.json });
  });
  return session;
}
