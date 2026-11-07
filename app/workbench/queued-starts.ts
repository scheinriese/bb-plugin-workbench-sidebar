import { z } from "zod";
import type { useSdk } from "@get-bb/plugin-sdk/app";
import type { SidebarQueuedStartDto } from "../../shared/boat-sidebar.js";
import { getProjectThreadItemDescendants, type ProjectThreadItem } from "../model/project-thread-groups.js";
import { getCollapsedChildActivity } from "../model/thread-activity.js";

export function queueRequestOrder(rows: readonly SidebarQueuedStartDto[], source: string) {
  return rows.filter(row => row.sourceThreadId === source).map((row, index) => ({ row, index }))
    .sort((a, b) => a.row.createdAt.localeCompare(b.row.createdAt) || a.index - b.index).map(item => item.row);
}
export function queueHref(row: SidebarQueuedStartDto) {
  if (row.state === "started" && row.taskId)
    return `/plugins/boat/cloud-agents/task/${encodeURIComponent(row.taskId)}`;
  return row.sourceThreadId ? `/threads/${encodeURIComponent(row.sourceThreadId)}` : null;
}
export function queueSecondLine(row: SidebarQueuedStartDto) {
  if (row.state === "started") return "Task started · open task";
  if (row.state === "dispatching") return "Starting…";
  const reset = row.resetsAt ? new Date(row.resetsAt) : null;
  const clock = reset && Number.isFinite(reset.getTime())
    ? reset.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase() : null;
  return `Waits for reset${clock ? ` · ${clock}` : ""}`;
}

const requestSchema = z.object({ id: z.string(), revision: z.number().int().nonnegative(),
  state: z.enum(["waiting", "dispatching", "started", "failed", "cancelled"]),
  threadId: z.string().nullable(), requestedProvider: z.enum(["claude", "codex"]).nullable() });
export async function queueAction(sdk: Pick<ReturnType<typeof useSdk>, "plugins">, row: SidebarQueuedStartDto, action: "start" | "cancel") {
  const current = await sdk.plugins.callRpc({ pluginId: "boat", method: "queuedStart", input: { id: row.id }, outputSchema: requestSchema.nullable() });
  if (!current || current.id !== row.id || current.threadId !== row.sourceThreadId || !["waiting", "dispatching"].includes(current.state)) throw new Error("This request has changed. Open its source chat for the current receipt.");
  if (action === "cancel") {
    await sdk.plugins.callRpc({ pluginId: "boat", method: "cancelQueuedStart", input: { id: current.id, revision: current.revision }, outputSchema: requestSchema });
    return;
  }
  const provider = current.requestedProvider ?? row.provider;
  if (current.state !== "waiting" || !provider || !current.threadId) throw new Error("This request cannot start now. Check its source chat.");
  // This requests Boat's existing paid-choice form. It never submits approval.
  await sdk.plugins.callRpc({ pluginId: "boat", method: "requestPaidStart", input: { id: current.id, revision: current.revision, provider },
    outputSchema: z.object({ pending: z.literal(true), requestId: z.string(), threadId: z.string(), duplicate: z.boolean() }) });
}

/** Extract genuine replacement subtrees without inventing thread identities. */
export function partitionQueuedChildren(items: readonly ProjectThreadItem[], rows: readonly SidebarQueuedStartDto[]) {
  const wanted = new Set(rows.filter(row => row.state === "started" && row.taskThreadId).map(row => row.taskThreadId!));
  const replacements = new Map<string, ProjectThreadItem>();
  const filter = (items: readonly ProjectThreadItem[]): ProjectThreadItem[] => items.flatMap(item => {
    if (item.kind === "thread") {
      if (!wanted.has(item.node.thread.id)) return [item];
      replacements.set(item.node.thread.id, item); return [];
    }
    if (item.kind === "section") {
      const remaining = filter(item.group.items);
      const threads = getProjectThreadItemDescendants(remaining);
      return remaining.length ? [{ ...item, group: { ...item.group, items: remaining, threadCount: threads.length, activity: getCollapsedChildActivity(threads) } }] : [];
    }
    const remaining = filter(item.group.nodes.map(node => ({ kind: "thread" as const, node })));
    if (remaining.length < 2) return remaining;
    const nodes = remaining.map(item => (item as Extract<ProjectThreadItem, { kind: "thread" }>).node) as typeof item.group.nodes;
    const threads = getProjectThreadItemDescendants(remaining);
    return [{ ...item, group: { ...item.group, nodes, stats: { childCount: threads.length, childActivity: getCollapsedChildActivity(threads) } } }];
  });
  return { items: filter(items), replacements };
}
