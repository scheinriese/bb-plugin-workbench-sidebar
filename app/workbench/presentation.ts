import { compareHeldOrder } from "./order-policy.js";
import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
import type { SidebarThread } from "../model/sidebar-thread.js";

/** Owner-confirmed boundary: basic groups retain BB order. */
export const MANY_TASKS_THRESHOLD = 7;
const urgency = {
  "needs-you": 0,
  broken: 1,
  ready: 2,
  review: 3,
  working: 3,
  stopped: 5,
  "waiting-reset": 5,
  shipped: 7,
};
export function compareBoatUrgency(
  left: SidebarThread,
  right: SidebarThread,
): number {
  const held = compareHeldOrder(left, right);
  if (held) return held;
  if (left.workbenchHeldThread && !right.workbenchHeldThread) return -1;
  if (!left.workbenchHeldThread && right.workbenchHeldThread) return 1;
  left = left.workbenchHeldThread ?? left;
  right = right.workbenchHeldThread ?? right;
  if (
    (left.boatSiblingCount ?? 0) < MANY_TASKS_THRESHOLD ||
    (right.boatSiblingCount ?? 0) < MANY_TASKS_THRESHOLD ||
    !left.boat ||
    !right.boat ||
    left.parentThreadId !== right.parentThreadId ||
    left.parentThreadId === null
  )
    return 0;
  const rank = (row: SidebarThreadDto) =>
    ["working", "review"].includes(row.status) && row.moving === false
      ? 5
      : urgency[row.status];
  return rank(left.boat) - rank(right.boat);
}
export function applyBoatState(
  threads: readonly SidebarThread[],
  states: ReadonlyMap<string, SidebarThreadDto>,
): readonly SidebarThread[] {
  if (!states.size) return threads;
  const siblingCounts = new Map<string, number>();
  for (const row of states.values())
    if (
      row.role === "task" &&
      !row.hidden &&
      row.status !== "shipped" &&
      row.parentThreadId
    )
      siblingCounts.set(
        row.parentThreadId,
        (siblingCounts.get(row.parentThreadId) ?? 0) + 1,
      );
  return threads.flatMap((thread) => {
    const boat = states.get(thread.id);
    if (!boat) return [thread];
    // Filter only from the sidebar. Host search and other surfaces keep every thread.
    if (
      boat.hidden ||
      (boat.role === "task" && boat.status === "shipped") ||
      (boat.role === "review" &&
        (boat.moving === false ||
          (boat.status !== "review" && boat.status !== "working")))
    )
      return [];
    return [
      {
        ...thread,
        parentThreadId:
          boat.role === "chat" ? thread.parentThreadId : boat.parentThreadId,
        boat,
        boatSiblingCount: boat.parentThreadId
          ? (siblingCounts.get(boat.parentThreadId) ?? 0)
          : 0,
      },
    ];
  });
}
export function rollupText(
  rollup: NonNullable<SidebarThreadDto["rollup"]>,
): string {
  return [
    [rollup.needsYou, "need you"],
    [rollup.stopped, "stopped"],
    [rollup.ready, "ready"],
    [rollup.working, "working"],
  ]
    .filter(([n]) => Number(n) > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(" · ");
}
export function secondLineFor(
  boat: SidebarThreadDto | undefined,
  collapsed = false,
) {
  if (
    (boat?.role === "orchestrator" || boat?.role === "chat") &&
    collapsed &&
    boat.rollup
  ) {
    const text = rollupText(boat.rollup);
    return text ? { text, tone: "neutral" as const } : null;
  }
  if (boat?.role === "orchestrator" || (boat?.role === "chat" && boat.rollup))
    return null;
  return boat && ["needs-you", "broken", "ready"].includes(boat.status)
    ? boat.secondLine
    : null;
}
export function rowGeometry(depth: number, mobile: boolean, second: boolean) {
  return {
    paddingLeft: (mobile ? 14 : 10) + 24 * depth,
    height: mobile ? (second ? 56 : 40) : second ? 42 : 28,
    highlightLeft: depth === 0 ? 4 : 27 + 24 * (depth - 1),
  };
}
