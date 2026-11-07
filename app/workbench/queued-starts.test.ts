import { describe, expect, it, vi } from "vitest";
import { createFakeSdk } from "@get-bb/plugin-sdk/testing";
import { queueAction, queueHref, queueSecondLine, queueRequestOrder, partitionQueuedChildren } from "./queued-starts.js";
import { applyBoatState } from "./presentation.js";
import { makeSidebarThread } from "../model/fixtures.js";
import { buildProjectThreadGroups, getProjectThreadItemDescendants } from "../model/project-thread-groups.js";
import { isNewForYou } from "./SeenThreads.js";
import { sidebarRpcMethods, type SidebarQueuedStartDto } from "../../shared/boat-sidebar.js";
export const request = (overrides: Partial<SidebarQueuedStartDto> = {}): SidebarQueuedStartDto => ({
  id: "request-1", revision: 1, title: "Gift wrap", sourceThreadId: "source", provider: "claude",
  resetsAt: "2026-11-07T15:00:00Z", createdAt: "2026-11-07T12:00:00Z", state: "waiting", taskId: null, taskThreadId: null, ...overrides,
});
describe("Actual queued starts", () => {
  it("accepts old producers, bounds requests and excludes terminal states", () => {
    const envelope = { version: 1, revision: "1", threads: [], truncated: false };
    expect(sidebarRpcMethods.sidebarState.output.safeParse(envelope).success).toBe(true);
    expect(sidebarRpcMethods.sidebarState.output.safeParse({ ...envelope, queuedStarts: Array(201).fill(request()) }).success).toBe(false);
    expect(sidebarRpcMethods.sidebarState.output.safeParse({ ...envelope, queuedStarts: [request({ state: "cancelled" as never })] }).success).toBe(false);
  });
  it("uses source navigation while waiting, real task detail for headless starts and truthful reset formatting", () => {
    expect(queueHref(request())).toBe("/threads/source");
    expect(queueHref(request({ state: "started", taskId: "real-task", taskThreadId: null }))).toBe("/plugins/boat/cloud-agents/task/real-task");
    expect(queueSecondLine(request({ resetsAt: null }))).toBe("Waits for reset");
    expect(queueSecondLine(request({ state: "dispatching" }))).toBe("Starting…");
    expect(queueHref(request({ sourceThreadId: null }))).toBeNull();
  });
  it("keeps request order and substitutes the genuine task subtree after all ordinary tasks", () => {
    const source = makeSidebarThread({ id: "source" }), task = makeSidebarThread({ id: "actual", parentThreadId: "source", originPluginId: "boat" });
    const queues = [request({ id: "second", createdAt: "2026-11-07T13:00:00Z" }), request({ state: "started", taskId: "t", taskThreadId: task.id })];
    expect(queueRequestOrder(queues, source.id).map(row => row.id)).toEqual(["request-1", "second"]);
    const projected = applyBoatState([source, task], new Map(), queues);
    expect(isNewForYou(projected[1]!, new Set())).toBe(false);
    expect(projected[0]!.workbenchWaiting).toBe(1);
    const tree = buildProjectThreadGroups(projected, undefined, false)[0]!;
    if (tree.kind !== "thread") throw Error("Expected source subtree");
    const partition = partitionQueuedChildren(tree.node.children, queues);
    expect(partition.items).toEqual([]);
    expect(getProjectThreadItemDescendants([...partition.replacements.values()]).map(thread => thread.id)).toEqual(["actual"]);
  });
  it("requests only the existing paid-choice form using a freshly read revision; never submits approval", async () => {
    const calls: string[] = [];
    const sdk = createFakeSdk({ pluginId: "workbench-sidebar", overrides: { plugins: { callRpc: async ({ method, input }) => {
      calls.push(method);
      if (method === "queuedStart") return { id: "request-1", revision: 9, state: "waiting", threadId: "source", requestedProvider: "claude" } as never;
      expect(input).toEqual({ id: "request-1", revision: 9, provider: "claude" });
      return { pending: true, requestId: "form", threadId: "source", duplicate: false } as never;
    } } } });
    await queueAction(sdk.sdk, request(), "start");
    expect(calls).toEqual(["queuedStart", "requestPaidStart"]);
  });
  it("cancels with a fresh revision and refuses stale/started requests without a start or cancel", async () => {
    const callRpc = vi.fn(async ({ method }: { method: string }) => method === "queuedStart" ? { id: "request-1", revision: 4, state: "dispatching", threadId: "source", requestedProvider: null } : { id: "request-1", revision: 5, state: "cancelled", threadId: "source", requestedProvider: null });
    await queueAction({ plugins: { callRpc } } as never, request(), "cancel");
    expect(callRpc.mock.calls[1]![0]).toMatchObject({ method: "cancelQueuedStart", input: { id: "request-1", revision: 4 } });
    callRpc.mockClear();callRpc.mockResolvedValue({ id: "request-1", revision: 5, state: "started", threadId: "source", requestedProvider: null });
    await expect(queueAction({ plugins: { callRpc } } as never, request(), "start")).rejects.toThrow("changed");
    expect(callRpc).toHaveBeenCalledTimes(1);
  });
});
