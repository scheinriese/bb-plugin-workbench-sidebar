import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSdk } from "@get-bb/plugin-sdk/app";
import {
  sidebarRpcMethods,
  type SidebarThreadDto,
} from "../../shared/boat-sidebar.js";

export const BoatStateContext = createContext<
  ReadonlyMap<string, SidebarThreadDto>
>(new Map());
/** One bounded read for the list, never a request per row. Boat is optional. */
export function BoatStateProvider({ children }: { children: ReactNode }) {
  const sdk = useSdk();
  const [state, setState] = useState<ReadonlyMap<string, SidebarThreadDto>>(
    new Map(),
  );
  useEffect(() => {
    let disposed = false;
    let revision: string | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    let inFlight = false;
    const refresh = async () => {
      if (disposed || inFlight) return;
      clearTimeout(timer);
      inFlight = true;
      controller = new AbortController();
      try {
        const result = await sdk.plugins.callRpc({
          pluginId: "boat",
          method: "sidebarState",
          input: { version: 1 },
          outputSchema: sidebarRpcMethods.sidebarState.output,
          signal: controller.signal,
        });
        if (!disposed && result.revision !== revision) {
          revision = result.revision;
          setState(new Map(result.threads.map((row) => [row.threadId, row])));
        }
      } catch {
        // Missing/disabled/older Boat and invalid responses quietly restore generic BB.
        if (!disposed) {
          revision = null;
          setState((previous) => (previous.size ? new Map() : previous));
        }
      } finally {
        inFlight = false;
        if (!disposed)
          timer = setTimeout(refresh, document.hidden ? 30_000 : 3_000);
      }
    };
    const visibility = () => {
      if (!document.hidden) void refresh();
    };
    void refresh();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [sdk]);
  return (
    <BoatStateContext.Provider value={state}>
      {children}
    </BoatStateContext.Provider>
  );
}
export function useBoatState() {
  return useContext(BoatStateContext);
}
