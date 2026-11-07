import type { SidebarThread } from "../model/sidebar-thread.js";
import { MANY_TASKS_THRESHOLD, openChildSummaries } from "./presentation.js";
export function firstRollupCrossings(
  threads: readonly SidebarThread[],
  seen: readonly string[],
): string[] {
  return [...openChildSummaries(threads)]
    .filter(
      ([id, summary]) => summary.open >= MANY_TASKS_THRESHOLD && !seen.includes(id),
    )
    .map(([id]) => id);
}
