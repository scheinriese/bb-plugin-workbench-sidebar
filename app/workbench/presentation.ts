import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
import type { SidebarThread } from "../model/sidebar-thread.js";

const urgency = { "needs-you": 0, broken: 1, ready: 2, review: 3, working: 4, stopped: 5, "waiting-reset": 6, shipped: 7 };
export function compareBoatUrgency(left: SidebarThread, right: SidebarThread): number {
  if (!left.boat || !right.boat || left.parentThreadId !== right.parentThreadId || left.parentThreadId === null) return 0;
  return urgency[left.boat.status] - urgency[right.boat.status];
}
export function applyBoatState(threads: readonly SidebarThread[], states: ReadonlyMap<string, SidebarThreadDto>): readonly SidebarThread[] {
  if (!states.size) return threads;
  return threads.flatMap(thread => {
    const boat = states.get(thread.id);
    if (!boat) return [thread];
    // Filter only from the sidebar. Host search and other surfaces keep every thread.
    if (boat.hidden || (boat.role === "task" && boat.status === "shipped") || (boat.role === "review" && boat.status !== "review" && boat.status !== "working")) return [];
    return [{ ...thread, parentThreadId: boat.parentThreadId, boat }];
  });
}
export function rollupText(rollup: NonNullable<SidebarThreadDto["rollup"]>): string {
  return [[rollup.needsYou,"need you"],[rollup.stopped,"stopped"],[rollup.ready,"ready"],[rollup.working,"working"]].filter(([n]) => Number(n) > 0).map(([n,label]) => `${n} ${label}`).join(" · ");
}
export function secondLineFor(boat: SidebarThreadDto | undefined, collapsed = false) {
  if (boat?.role === "orchestrator" && collapsed && boat.rollup) {
    const text = rollupText(boat.rollup);
    return text ? { text, tone: "neutral" as const } : null;
  }
  if (boat?.role === "orchestrator") return null;
  return boat && ["needs-you", "broken", "ready"].includes(boat.status) ? boat.secondLine : null;
}
export function rowGeometry(depth: number, mobile: boolean, second: boolean) {
  return { paddingLeft: (mobile ? 14 : 10) + 24 * depth, height: mobile ? (second ? 56 : 40) : (second ? 42 : 28), highlightLeft: depth === 0 ? 4 : 27 + 24 * (depth - 1) };
}
