export type CanvasGuideTopicId = "milestones" | "checkpoints" | "connections" | "claims" | "navigation";

export interface CanvasGuideTopic {
  id: CanvasGuideTopicId;
  title: string;
  pointer: string;
  touch: string;
}

export const CANVAS_GUIDE_TOPICS: readonly CanvasGuideTopic[] = [
  {
    id: "milestones",
    title: "Milestones are your plan",
    pointer: "Press N or use Milestone in the dock to add a card. Double-click a title to rename it, and open details for the description and status.",
    touch: "Tap Milestone in the dock to add a card. Tap a card, then Details to rename it and edit its description.",
  },
  {
    id: "checkpoints",
    title: "Checkpoints track progress",
    pointer: "Add checkpoints in a milestone's details, then tick them off on the card. A milestone completes when every checkpoint is done.",
    touch: "Add checkpoints in a milestone's details. Tap the circle next to a checkpoint on the card to mark it done.",
  },
  {
    id: "connections",
    title: "Connections show order",
    pointer: "Hover a card and click a dot, then click a dot on another card. Press Esc to cancel. AWS services use the same dots for data flow.",
    touch: "Tap a card, tap one of its dots, then tap a dot on another card. Tap Cancel to stop connecting.",
  },
  {
    id: "claims",
    title: "Claim a card to edit it",
    pointer: "Cards you hold show You. Others must claim a card, or request it from the current editor, before changing it. Claims expire after a few idle minutes.",
    touch: "Tap a card, then Claim to edit it. If someone else holds it, request it. Claims expire after a few idle minutes.",
  },
  {
    id: "navigation",
    title: "Find your way around",
    pointer: "Press Ctrl or ⌘ K to search, Shift 1 to fit everything, and Space plus drag to pan. The radar shows where you are.",
    touch: "Drag to pan and pinch to zoom. Use Find to jump to a card, and the tools menu to fit everything on screen.",
  },
];

const STORAGE_PREFIX = "novastage:canvas-guide:v1:";

export const guideStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

type GuideStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const listeners = new Set<() => void>();
// Keeps the guide dismissible for this page view even when storage is blocked.
const dismissedInMemory = new Set<string>();

export function subscribeGuide(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

function safeStorage(): GuideStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isGuideDismissed(userId: string, storage: GuideStorage | null = safeStorage()) {
  if (dismissedInMemory.has(userId)) return true;
  try {
    return storage?.getItem(guideStorageKey(userId)) === "dismissed";
  } catch {
    return false;
  }
}

export function setGuideDismissed(userId: string, dismissed: boolean, storage: GuideStorage | null = safeStorage()) {
  if (dismissed) dismissedInMemory.add(userId);
  else dismissedInMemory.delete(userId);
  try {
    if (dismissed) storage?.setItem(guideStorageKey(userId), "dismissed");
    else storage?.removeItem(guideStorageKey(userId));
  } catch {
    // Private browsing can block storage; the in-memory flag covers this page view.
  }
  listeners.forEach((listener) => listener());
}
