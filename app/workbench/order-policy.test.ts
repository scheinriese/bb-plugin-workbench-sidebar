import { expect, it } from "vitest";
import { holdComparator } from "./order-policy.js";
import { getSidebarThreadComparator } from "../list/ProjectList.js";
import { groupComparatorByReadStatus } from "../model/read-status-grouping.js";
import { makeSidebarThread } from "../model/fixtures.js";
import type { SidebarThread } from "../model/sidebar-thread.js";
import { NO_COLLAPSED_CHILD_ACTIVITY } from "../model/thread-activity.js";
import type { ProjectThreadItem } from "../model/project-thread-groups.js";

function item(thread: SidebarThread): ProjectThreadItem {
  return {
    kind: "thread",
    node: {
      thread,
      children: [],
      depth: 0,
      stats: { childCount: 0, childActivity: NO_COLLAPSED_CHILD_ACTIVITY },
    },
  };
}

it("holds alphabetic item order when automatic titles change, then releases", () => {
  const a = makeSidebarThread({ id: "a", title: "Alpha" });
  const b = makeSidebarThread({ id: "b", title: "Beta" });
  const changed: SidebarThread = {
    ...a,
    displayTitle: "Zulu",
    workbenchHeldRank: 0,
    workbenchHeldThread: a,
  };
  const heldB: SidebarThread = {
    ...b,
    workbenchHeldRank: 1,
    workbenchHeldThread: b,
  };
  const base = getSidebarThreadComparator("alpha");
  expect(base.compareItems!(item(changed), item(b))).toBeGreaterThan(0);
  expect(
    holdComparator(base).compareItems!(item(changed), item(heldB)),
  ).toBeLessThan(0);
  expect(
    holdComparator(base).compareItems!(
      item({ ...a, displayTitle: "Zulu" }),
      item(b),
    ),
  ).toBeGreaterThan(0);
});

it("holds outside unread grouping so an arriving unread status cannot jump under a click", () => {
  const a: SidebarThread = {
    ...makeSidebarThread({ id: "a", isUnread: false }),
    workbenchHeldRank: 0,
  };
  const b: SidebarThread = {
    ...makeSidebarThread({ id: "b", isUnread: true }),
    workbenchHeldRank: 1,
  };
  const grouped = groupComparatorByReadStatus(
    getSidebarThreadComparator("updated"),
    (t) => t.isUnread,
  );
  expect(grouped(a, b)).toBeGreaterThan(0);
  expect(holdComparator(grouped)(a, b)).toBeLessThan(0);
});
