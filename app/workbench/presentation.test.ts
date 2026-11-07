import { describe, expect, it } from "vitest";
import {
  applyBoatState,
  compareBoatUrgency,
  secondLineFor,
  rowGeometry,
  genericRollupText,
  rollupText,
} from "./presentation.js";
import { buildProjectThreadGroups } from "../model/project-thread-groups.js";
import { makeSidebarThread } from "../model/fixtures.js";
import {
  sidebarRpcMethods,
  type SidebarThreadDto,
} from "../../shared/boat-sidebar.js";
const dto = (
  threadId: string,
  fields: Partial<SidebarThreadDto> = {},
): SidebarThreadDto => ({
  threadId,
  role: "task",
  status: "working",
  provider: "claude",
  secondLine: null,
  parentThreadId: "lead",
  rollup: null,
  createdFor: null,
  listedIn: null,
  hidden: false,
  updatedAt: "2026-11-07T00:00:00Z",
  ...fields,
});
describe("Boat sidebar projection", () => {
  it("keeps generic data unchanged when Boat is absent", () => {
    const threads = [makeSidebarThread()];
    expect(applyBoatState(threads, new Map())).toBe(threads);
  });
  it("rolls up open generic children from authentic BB activity without Boat or invented urgency", () => {
    const parent = makeSidebarThread({ id: "generic-parent" });
    const children = Array.from({ length: 18 }, (_, i) => makeSidebarThread({
      id: `child-${i}`, parentThreadId: parent.id,
      runtimeStatus: i < 2 ? "active" : "idle",
      activity: { workflows: i === 2 ? 1 : 0 },
    }));
    const result = applyBoatState([parent, ...children,
      makeSidebarThread({ id: "archived", parentThreadId: parent.id, archivedAt: 1 }),
      makeSidebarThread({ id: "hidden", parentThreadId: parent.id, isHidden: true }),
      makeSidebarThread({ id: "grandchild", parentThreadId: children[0]!.id }),
    ], new Map());
    expect(result[0]?.workbenchChildren).toEqual({ open: 18, working: 3 });
    expect(genericRollupText(result[0]!.workbenchChildren!)).toBe("18 threads · 3 working");
    expect(result.slice(1, 19)).toEqual(children);
    expect(compareBoatUrgency(children[0]!, children[1]!)).toBe(0);
  });
  it("uses correct singular counts and omits zero generic working counts", () => {
    expect(genericRollupText({ open: 1, working: 0 })).toBe("1 thread");
    expect(rollupText({ needsYou: 1, stopped: 1, ready: 1, working: 1, shippedToday: 1 }))
      .toBe("1 needs you · 1 stopped · 1 ready · 1 working");
    expect(rollupText({ needsYou: 2, stopped: 0, ready: 0, working: 0, shippedToday: 0 }))
      .toBe("2 need you");
  });
  it("hides finished tasks and retired reviews only from sidebar, preserves generic and active reviews", () => {
    const threads = ["lead", "done", "retired", "review", "generic"].map((id) =>
      makeSidebarThread({ id }),
    );
    const states = new Map(
      [
        dto("lead", { role: "orchestrator", parentThreadId: null }),
        dto("done", { status: "shipped" }),
        dto("retired", { role: "review", status: "ready" }),
        dto("review", {
          role: "review",
          status: "review",
          parentThreadId: "task",
        }),
      ].map((s) => [s.threadId, s]),
    );
    const result = applyBoatState(threads, states);
    expect(result.map((t) => t.id)).toEqual(["lead", "review", "generic"]);
    expect(threads).toHaveLength(5);
    expect(result.find((t) => t.id === "review")?.parentThreadId).toBe("task");
  });
  it("sorts many-task Boat siblings by urgency even with reverse chronological source and preserves generic comparator", () => {
    const statuses = ["working", "ready", "broken", "needs-you"] as const;
    const threads = statuses.map((status, i) => ({
      ...makeSidebarThread({
        id: status,
        parentThreadId: "lead",
        projectId: "proj_test",
        createdAt: 10 - i,
      }),
      boat: dto(status, { status }),
      boatSiblingCount: 10,
    }));
    expect([...threads].sort(compareBoatUrgency).map((t) => t.id)).toEqual([
      "needs-you",
      "broken",
      "ready",
      "working",
    ]);
    const grouped = buildProjectThreadGroups(
      [makeSidebarThread({ id: "lead", projectId: "proj_test" }), ...threads],
      undefined,
      false,
    );
    expect(grouped[0]?.kind).toBe("thread");
    if (grouped[0]?.kind === "thread")
      expect(
        grouped[0].node.children.map((item) =>
          item.kind === "thread" ? item.node.thread.id : null,
        ),
      ).toEqual(["needs-you", "broken", "ready", "working"]);
  });
  it("retains BB sibling order for basic groups", () => {
    const a = {
      ...makeSidebarThread({ id: "a", parentThreadId: "lead" }),
      boat: dto("a", { status: "working" }),
      boatSiblingCount: 4,
    };
    const b = {
      ...makeSidebarThread({ id: "b", parentThreadId: "lead" }),
      boat: dto("b", { status: "needs-you" }),
      boatSiblingCount: 4,
    };
    expect(compareBoatUrgency(a, b)).toBe(0);
  });
  it("uses one neutral rollup only when collapsed and second lines only for action states", () => {
    const lead = dto("lead", {
      role: "orchestrator",
      rollup: {
        needsYou: 2,
        stopped: 1,
        ready: 3,
        working: 4,
        shippedToday: 2,
      },
    });
    expect(secondLineFor(lead, true)).toEqual({
      text: "2 need you · 1 stopped · 3 ready · 4 working",
      tone: "neutral",
    });
    expect(secondLineFor(lead, false)).toBeNull();
    expect(
      secondLineFor(
        dto("t", {
          status: "working",
          secondLine: { text: "Do not show", tone: "neutral" },
        }),
      ),
    ).toBeNull();
    expect(
      secondLineFor(
        dto("t", {
          status: "ready",
          secondLine: { text: "PR #485 · ready to merge", tone: "success" },
        }),
      )?.tone,
    ).toBe("success");
  });
  it("shows the one neutral reset exception only when the producer supplies a known resume line", () => {
    const paused = dto("t", {
      status: "waiting-reset",
      moving: false,
      secondLine: { text: "Waits for reset · 4:00 pm", tone: "neutral" },
    });
    expect(secondLineFor(paused)).toEqual(paused.secondLine);
    expect(secondLineFor({ ...paused, secondLine: null })).toBeNull();
    expect(
      secondLineFor({
        ...paused,
        secondLine: { text: "No authored time", tone: "attention" },
      }),
    ).toBeNull();
    expect(secondLineFor({ ...paused, status: "working" })).toBeNull();
  });
  it("enforces v1 and the 2000-row response bound", () => {
    const schema = sidebarRpcMethods.sidebarState.output;
    expect(
      schema.safeParse({
        version: 2,
        revision: "1",
        threads: [],
        truncated: false,
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        version: 1,
        revision: "1",
        threads: Array.from({ length: 2001 }, () => dto("t")),
        truncated: false,
      }).success,
    ).toBe(false);
  });
  it("uses exact desktop and phone geometry", () => {
    expect(rowGeometry(0, false, false)).toEqual({
      paddingLeft: 10,
      height: 28,
      highlightLeft: 4,
    });
    expect(rowGeometry(1, false, true)).toEqual({
      paddingLeft: 34,
      height: 42,
      highlightLeft: 27,
    });
    expect(rowGeometry(2, false, false)).toEqual({
      paddingLeft: 58,
      height: 28,
      highlightLeft: 51,
    });
    expect(rowGeometry(1, true, true)).toEqual({
      paddingLeft: 38,
      height: 56,
      highlightLeft: 27,
    });
  });
});
