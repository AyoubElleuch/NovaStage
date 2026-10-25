export const project = { id: "canvas-smoke", slug: "canvas-smoke", name: "Launch workspace", invite_code: "NS-TEST0", created_by: "smoke-user" };
export const currentUser = { id: "smoke-user", email: "canvas-smoke@example.test", fullName: "Canvas Tester" };

const base = {
  project_id: project.id, description: "", status: "draft", width: 280, height: 170,
  color: "default", claimed_by: currentUser.id, version: 1, checkpoints: [],
};

export const nodes = [
  { ...base, id: "plan", title: "Plan the release", position_x: -180, position_y: -100, sort_order: 0,
    checkpoints: [{ id: "scope", node_id: "plan", project_id: project.id, title: "Agree release scope", is_completed: true, sort_order: 0 }] },
  { ...base, id: "build", title: "Build the platform", position_x: 200, position_y: -100, sort_order: 1,
    status: "in_progress", checkpoints: [{ id: "queue", node_id: "build", project_id: project.id, title: "Configure the message queue", is_completed: false, sort_order: 0 }] },
  { ...base, id: "ship", title: "Ship with confidence", position_x: 580, position_y: -100, sort_order: 2 },
  { ...base, id: "vpc", title: "Production network", position_x: 160, position_y: 220, width: 700, height: 300,
    sort_order: 3, node_type: "group", group_metadata: { label: "Production network", style: "vpc", childNodeIds: ["compute", "storage"] } },
  { ...base, id: "compute", title: "Application servers", position_x: 200, position_y: 320, width: 240, height: 150,
    sort_order: 4, node_type: "aws_service", parent_group_id: "vpc", aws_metadata: { serviceId: "ec2", region: "eu-west-1", config: {} } },
  { ...base, id: "storage", title: "Release artifacts", position_x: 560, position_y: 320, width: 240, height: 150,
    sort_order: 5, node_type: "aws_service", parent_group_id: "vpc", aws_metadata: { serviceId: "s3", region: "eu-west-1", config: {} } },
];

export const edges = [
  { id: "plan-build", project_id: project.id, source_node_id: "plan", target_node_id: "build", source_handle: "right", target_handle: "left", edge_type: "dependency" },
  { id: "build-ship", project_id: project.id, source_node_id: "build", target_node_id: "ship", source_handle: "right", target_handle: "left", edge_type: "dependency" },
  { id: "compute-storage", project_id: project.id, source_node_id: "compute", target_node_id: "storage", source_handle: "right", target_handle: "left", edge_type: "data_flow", label: "Store artifacts" },
];
