import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { experimental_useSidebarThreads } from "@get-bb/plugin-sdk/app";
import { useBoatState } from "./BoatState.js";
import type { SidebarThread } from "../model/sidebar-thread.js";
import { applyBoatState } from "./presentation.js";
import { useAtomValue } from "jotai";
import { sidebarThreadLifecyclesAtom } from "../preferences/atoms.js";
export { holdComparator } from "./order-policy.js";
export interface HeldOrder {
  ranks: ReadonlyMap<string, number>;
  threads: ReadonlyMap<string, SidebarThread>;
}
export const OrderHoldContext = createContext<HeldOrder | null>(null);
export function OrderHoldProvider({
  children,
  mobile,
}: {
  children: ReactNode;
  mobile: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ranks, setRanks] = useState<HeldOrder | null>(null);
  const lifecycles = useAtomValue(sidebarThreadLifecyclesAtom);
  const source = experimental_useSidebarThreads({
    experimental_lifecycles: lifecycles,
  }).threads;
  const boat = useBoatState();
  const snapshots = useRef<ReadonlyMap<string, SidebarThread>>(new Map());
  snapshots.current = new Map(
    applyBoatState(source, boat).map((thread) => [thread.id, thread]),
  );
  useEffect(() => {
    let over = false,
      keyboard = false,
      held = false,
      keyboardInput = false;
    const update = () => {
      const next = over || keyboard;
      if (next === held) return;
      held = next;
      setRanks(
        next
          ? {
              ranks: new Map(
                [
                  ...(ref.current?.querySelectorAll<HTMLElement>(
                    "[data-sidebar-thread-id]",
                  ) ?? []),
                ].map((element, index) => [
                  element.dataset.sidebarThreadId!,
                  index,
                ]),
              ),
              threads: snapshots.current,
            }
          : null,
      );
    };
    const pointer = (event: PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      over =
        !!box &&
        event.clientX >= Math.max(0, box.left + 8) &&
        event.clientX < box.right - 8;
      update();
    };
    const leave = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        over = false;
        update();
      }
    };
    const focus = () => {
      const active = document.activeElement;
      keyboard =
        active instanceof Element &&
        !!ref.current?.contains(active) &&
        active.closest(".wb-row") !== null &&
        (keyboardInput || active.matches(":focus-visible"));
      update();
    };
    const blur = () => queueMicrotask(focus);
    const key = () => {
      keyboardInput = true;
      focus();
    };
    const down = () => {
      keyboardInput = false;
      focus();
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("pointerout", leave);
    window.addEventListener("focusin", focus);
    window.addEventListener("focusout", blur);
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", down);
    return () => {
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("pointerout", leave);
      window.removeEventListener("focusin", focus);
      window.removeEventListener("focusout", blur);
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", down);
    };
  }, []);
  return (
    <OrderHoldContext.Provider value={ranks}>
      <div
        ref={ref}
        className="wb-list"
        data-workbench-mobile={mobile ? "true" : undefined}
      >
        {children}
      </div>
    </OrderHoldContext.Provider>
  );
}
export function useOrderHold() {
  return useContext(OrderHoldContext);
}
