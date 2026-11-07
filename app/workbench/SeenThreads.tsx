import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
  useMemo,
  type ReactNode,
} from "react";
import { useRpc, experimental_useSidebarThreads } from "@get-bb/plugin-sdk/app";
import type { threadListRpcContract } from "../../server.js";
import type { SidebarThread } from "../model/sidebar-thread.js";
import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
import { useBoatState, useQueuedStarts } from "./BoatState.js";

function createSeenStore() {
  let value: ReadonlySet<string> | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: ReadonlySet<string>) {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
const EMPTY_SEEN_STORE = createSeenStore();
const SeenThreadsContext = createContext(EMPTY_SEEN_STORE);
export function isNewForYou(
  thread: SidebarThread,
  seen: ReadonlySet<string> | null,
) {
  return (
    !thread.workbenchQueuedStartId &&
    (thread.boat
      ? thread.boat.createdFor === "you"
      : thread.originPluginId !== null) &&
    seen !== null &&
    !seen.has(thread.id)
  );
}
export function countNewChildren(
  parentId: string,
  states: ReadonlyMap<string, SidebarThreadDto>,
  seen: ReadonlySet<string> | null,
  alreadyListed: readonly string[] = [],
): number {
  if (!seen) return 0;
  let count = 0;
  for (const row of states.values()) {
    if (
      row.parentThreadId === parentId &&
      !row.hidden &&
      row.status !== "shipped" &&
      row.createdFor === "you" &&
      !seen.has(row.threadId)
      && !alreadyListed.includes(row.threadId)
    )
      count++;
  }
  return count;
}
export function threadsSeenOnOpen(
  activeThreadId: string,
  states: ReadonlyMap<string, SidebarThreadDto>,
) {
  return [
    activeThreadId,
    ...[...states.values()]
      .filter((row) => row.listedIn === activeThreadId)
      .map((row) => row.threadId),
  ];
}
export function SeenThreadsProvider({
  activeThreadId,
  children,
}: {
  activeThreadId: string | null;
  children: ReactNode;
}) {
  const rpc = useRpc<typeof threadListRpcContract>();
  const boat = useBoatState();
  const queued = useQueuedStarts();
  const hostThreads = experimental_useSidebarThreads().threads;
  const [store] = useState(createSeenStore);
  useEffect(() => {
    const ids = queued.filter(row => row.state === "started" && row.taskThreadId).map(row => row.taskThreadId!);
    if (!ids.length) return;
    store.set(new Set([...(store.get() ?? []), ...ids].slice(-10_000)));
    void rpc.call("markThreadsSeen", { threadIds: ids }).catch(() => {});
  }, [queued, rpc, store]);
  useEffect(() => {
    let disposed = false;
    void rpc
      .call("seenThreads", null)
      .then((result) => {
        if (!disposed)
          store.set(new Set([...result.threadIds, ...(store.get() ?? [])]));
      })
      .catch(() => {
        if (!disposed) store.set(new Set(store.get()));
      });
    return () => {
      disposed = true;
    };
  }, [rpc, store]);
  useEffect(() => {
    const hostSeen = hostThreads
      .filter(
        (thread) =>
          thread.lastReadAt !== null && thread.lastReadAt > thread.createdAt,
      )
      .map((thread) => thread.id);
    if (hostSeen.length)
      store.set(new Set([...(store.get() ?? []), ...hostSeen]));
  }, [hostThreads, store]);
  useEffect(() => {
    if (!activeThreadId) return;
    const ids = threadsSeenOnOpen(activeThreadId, boat);
    store.set(new Set([...(store.get() ?? []), ...ids].slice(-10_000)));
    void rpc
      .call("markThreadsSeen", { threadIds: ids.slice(0, 2000) })
      .catch(() => {});
  }, [activeThreadId, boat, rpc, store]);
  return (
    <SeenThreadsContext.Provider value={store}>
      {children}
    </SeenThreadsContext.Provider>
  );
}
/** Primitive snapshots keep native row memoization: opening a chat must not redraw the whole list. */
export function useNewThreadSignals(
  thread: SidebarThread,
  states: ReadonlyMap<string, SidebarThreadDto>,
  collapsed: boolean,
) {
  const store = useContext(SeenThreadsContext);
  const queued = useQueuedStarts();
  const listed = useMemo(() => queued.filter(row => row.state === "started" && row.taskThreadId).map(row => row.taskThreadId!), [queued]);
  const snapshot = useCallback(
    () =>
      `${isNewForYou(thread, store.get()) ? 1 : 0}:${collapsed ? countNewChildren(thread.id, states, store.get(), listed) : 0}`,
    [store, thread, states, collapsed, listed],
  );
  const value = useSyncExternalStore(store.subscribe, snapshot, snapshot);
  const [isNew, count] = value.split(":");
  return { isNew: isNew === "1", newChildren: Number(count) };
}
