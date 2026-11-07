import { compareHeldOrder } from "./order-policy.js";
import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
import type { SidebarThread } from "../model/sidebar-thread.js";
import {
  hasThreadListWorkingActivity,
  threadListIndicatorStateForThread,
} from "../model/thread-activity.js";

/** Owner-confirmed boundary: basic groups retain BB order. */
export const MANY_TASKS_THRESHOLD = 7;
/** Direct, open children from the public BB list; no inferred Boat statuses. */
export function openChildSummaries(threads: readonly SidebarThread[]) {
  const summaries = new Map<string, { open: number; working: number }>();
  for (const thread of threads) {
    if (!thread.parentThreadId || thread.isArchived || thread.isHidden) continue;
    const summary = summaries.get(thread.parentThreadId) ?? {
      open: 0,
      working: 0,
    };
    summary.open += 1;
    if (
      hasThreadListWorkingActivity(threadListIndicatorStateForThread(thread, false))
    )
      summary.working += 1;
    summaries.set(thread.parentThreadId, summary);
  }
  return summaries;
}
export function genericRollupText(
  summary: NonNullable<SidebarThread["workbenchChildren"]>,
) {
  return `${summary.open} ${summary.open === 1 ? "thread" : "threads"}${summary.working ? ` · ${summary.working} working` : ""}`;
}
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
  const visible: SidebarThread[] = threads.flatMap((thread) => {
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
      },
    ];
  });
  const children = openChildSummaries(visible);
  const result = visible.map((thread) => {
    const own = children.get(thread.id);
    const siblings = thread.parentThreadId
      ? children.get(thread.parentThreadId)
      : undefined;
    if ((!own || own.open < MANY_TASKS_THRESHOLD) && !thread.boat) return thread;
    return {
      ...thread,
      ...(own && own.open >= MANY_TASKS_THRESHOLD
        ? { workbenchChildren: own }
        : {}),
      ...(thread.boat ? { boatSiblingCount: siblings?.open ?? 0 } : {}),
    };
  });
  return result.length === threads.length &&
    result.every((thread, index) => thread === threads[index])
    ? threads
    : result;
}
export function rollupText(
  rollup: NonNullable<SidebarThreadDto["rollup"]>,
): string {
  return [
    [rollup.needsYou, rollup.needsYou === 1 ? "needs you" : "need you"],
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
  // The producer emits this neutral line only for an actual paused task with
  // a known reset/resume time. Missing time remains a one-line idle row.
  if (boat?.status === "waiting-reset")
    return boat.secondLine?.tone === "neutral" ? boat.secondLine : null;
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
