import type { SidebarThread } from "../model/sidebar-thread.js";
import { MANY_TASKS_THRESHOLD } from "./presentation.js";
export function firstRollupCrossings(
  threads: readonly SidebarThread[],
  seen: readonly string[],
): string[] {
  const counts = new Map<string, number>();
  for (const thread of threads)
    if (thread.boat?.role === "task" && thread.parentThreadId)
      counts.set(
        thread.parentThreadId,
        (counts.get(thread.parentThreadId) ?? 0) + 1,
      );
  return [...counts]
    .filter(
      ([id, count]) => count >= MANY_TASKS_THRESHOLD && !seen.includes(id),
    )
    .map(([id]) => id);
}
