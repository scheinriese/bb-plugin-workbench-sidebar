import { describe, expect, it } from "vitest";
import { firstRollupCrossings } from "./auto-collapse.js";
import { makeSidebarThread } from "../model/fixtures.js";
import { compareBoatUrgency } from "./presentation.js";
import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
function task(id: string) {
  const boat: SidebarThreadDto = {
    threadId: id,
    role: "task",
    status: "working",
    provider: "codex",
    parentThreadId: "parent",
    createdFor: "you",
    listedIn: "parent",
    secondLine: null,
    rollup: null,
    hidden: false,
    updatedAt: "2026-11-07T00:00:00Z",
  };
  return {
    ...makeSidebarThread({ id, parentThreadId: "parent" }),
    boat,
    boatSiblingCount: 7,
  };
}
describe("Owner-confirmed many-task policy", () => {
  it("collapses once on seven open tasks and remembers a later user choice", () => {
    const threads = Array.from({ length: 7 }, (_, i) => task(String(i)));
    expect(firstRollupCrossings(threads.slice(0, 6), [])).toEqual([]);
    expect(firstRollupCrossings(threads, [])).toEqual(["parent"]);
    expect(firstRollupCrossings(threads, ["parent"])).toEqual([]);
  });
  it("uses the same first-crossing rule for generic parents, excluding hidden and archived children", () => {
    const children = Array.from({ length: 7 }, (_, i) => makeSidebarThread({
      id: `native-${i}`, parentThreadId: "generic-parent",
    }));
    const inactive = [
      makeSidebarThread({ id: "archived", parentThreadId: "generic-parent", archivedAt: 1 }),
      makeSidebarThread({ id: "hidden", parentThreadId: "generic-parent", isHidden: true }),
    ];
    expect(firstRollupCrossings([...children.slice(0, 6), ...inactive], [])).toEqual([]);
    expect(firstRollupCrossings([...children, ...inactive], [])).toEqual(["generic-parent"]);
    expect(firstRollupCrossings(children, ["generic-parent"])).toEqual([]);
  });
  it("keeps working and review in the same stable BB ordering bucket", () => {
    const a = task("a"),
      b = task("b");
    b.boat.status = "review";
    expect(compareBoatUrgency(a, b)).toBe(0);
  });
  it("holds the rendered order during pointer or keyboard interaction even after urgency changes", () => {
    const a = { ...task("a"), workbenchHeldRank: 0 },
      b = { ...task("b"), workbenchHeldRank: 1 };
    b.boat.status = "needs-you";
    expect(compareBoatUrgency(a, b)).toBeLessThan(0);
    delete (a as Partial<typeof a>).workbenchHeldRank;
    delete (b as Partial<typeof b>).workbenchHeldRank;
    expect(compareBoatUrgency(a, b)).toBeGreaterThan(0);
  });
});
