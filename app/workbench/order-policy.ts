import type { SidebarThread } from "../model/sidebar-thread.js";
import type {
  ThreadComparator,
  ProjectThreadItem,
} from "../model/project-thread-groups.js";
export function compareHeldOrder(
  left: SidebarThread,
  right: SidebarThread,
): number {
  return left.workbenchHeldRank !== undefined &&
    right.workbenchHeldRank !== undefined
    ? left.workbenchHeldRank - right.workbenchHeldRank
    : 0;
}
export function holdComparator(base: ThreadComparator): ThreadComparator {
  const compare: ThreadComparator = (left, right) =>
    compareHeldOrder(left, right) ||
    (left.workbenchHeldThread && !right.workbenchHeldThread
      ? -1
      : !left.workbenchHeldThread && right.workbenchHeldThread
        ? 1
        : base(
            left.workbenchHeldThread ?? left,
            right.workbenchHeldThread ?? right,
          ));
  const compareItems = base.compareItems;
  if (compareItems)
    compare.compareItems = (left, right) => {
      const l = representative(left),
        r = representative(right);
      if (l && r) {
        const held = compareHeldOrder(l, r);
        if (held) return held;
        if (l.workbenchHeldThread && !r.workbenchHeldThread) return -1;
        if (!l.workbenchHeldThread && r.workbenchHeldThread) return 1;
      }
      return compareItems(withSnapshot(left), withSnapshot(right));
    };
  return compare;
}

function representative(item: ProjectThreadItem): SidebarThread | undefined {
  const threads =
    item.kind === "thread"
      ? [item.node.thread]
      : item.kind === "environment"
        ? item.group.nodes.map((n) => n.thread)
        : item.group.items.flatMap((i) => {
            const row = representative(i);
            return row ? [row] : [];
          });
  return threads.reduce<SidebarThread | undefined>(
    (first, next) =>
      first === undefined ||
      (next.workbenchHeldRank ?? Infinity) <
        (first.workbenchHeldRank ?? Infinity)
        ? next
        : first,
    undefined,
  );
}

/** Alpha item comparators inspect node titles directly rather than compare(). */
function withSnapshot(item: ProjectThreadItem): ProjectThreadItem {
  if (item.kind === "thread")
    return {
      ...item,
      node: {
        ...item.node,
        thread: item.node.thread.workbenchHeldThread ?? item.node.thread,
      },
    };
  if (item.kind === "environment")
    return {
      ...item,
      group: {
        ...item.group,
        nodes: item.group.nodes.map((node) => ({
          ...node,
          thread: node.thread.workbenchHeldThread ?? node.thread,
        })) as typeof item.group.nodes,
      },
    };
  return item;
}
