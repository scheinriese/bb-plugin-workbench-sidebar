import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { threadListRpcContract } from "../../server.js";
export const TeamArtworkContext = createContext<
  Readonly<Record<string, string>>
>({});
export function useTeamArtwork() {
  return useContext(TeamArtworkContext);
}
/** bb 0.50.1 inlines import(), so artwork is a lazy, cached image payload,
 * not client JavaScript. No request is made while Team is off. */
export function TeamArtworkProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const rpc = useRpc<typeof threadListRpcContract>();
  const [images, setImages] = useState<Readonly<Record<string, string>>>({});
  const request = useRef<Promise<Record<string, string>> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    request.current ??= rpc.call("teamArtwork", null);
    void request.current
      .then((value) => {
        if (!disposed) setImages(value);
      })
      .catch(() => {
        request.current = null;
      });
    return () => {
      disposed = true;
    };
  }, [enabled, rpc]);
  return (
    <TeamArtworkContext.Provider value={images}>
      {children}
    </TeamArtworkContext.Provider>
  );
}
