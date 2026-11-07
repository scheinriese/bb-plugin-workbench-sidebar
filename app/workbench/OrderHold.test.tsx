import {
  installTestPluginRuntime,
  renderSlot,
} from "@get-bb/plugin-sdk/testing/app";
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { OrderHoldProvider, useOrderHold } from "./OrderHold.js";
installTestPluginRuntime();
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function Harness({ ids }: { ids: string[] }) {
  return (
    <OrderHoldProvider mobile={false}>
      <Rows ids={ids} />
    </OrderHoldProvider>
  );
}
function Rows({ ids }: { ids: string[] }) {
  const ranks = useOrderHold();
  return (
    <>
      <output>{ranks ? [...ranks.ranks.keys()].join(",") : "unlocked"}</output>
      {ids.map((id) => (
        <div key={id} className="wb-row">
          <a href={"#" + id} data-sidebar-thread-id={id}>
            {id}
          </a>
        </div>
      ))}
    </>
  );
}
it("holds actual rendered order across pointer entry, data changes, and release", () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(-8, 251, 335, 700),
  );
  const slot = renderSlot(
    { component: Harness },
    { ids: ["b", "a"] },
    { sidebarThreads: { threads: [], projects: [] } },
  );
  fireEvent.pointerMove(window, { clientX: 100, clientY: 20 });
  expect(screen.getByText("b,a")).toBeTruthy();
  act(() => slot.lifecycle.rerender(<Harness ids={["a", "b"]} />));
  expect(screen.getByText("b,a")).toBeTruthy();
  fireEvent.pointerMove(window, { clientX: 900, clientY: 20 });
  expect(screen.getByText("unlocked")).toBeTruthy();
});
it("keeps the hold while a row has keyboard focus after the pointer leaves", async () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(-8, 251, 335, 700),
  );
  renderSlot(
    { component: Harness },
    { ids: ["a", "b"] },
    { sidebarThreads: { threads: [], projects: [] } },
  );
  fireEvent.keyDown(window, { key: "Tab" });
  act(() => screen.getByRole("link", { name: "a" }).focus());
  expect(screen.getByText("a,b")).toBeTruthy();
  fireEvent.pointerMove(window, { clientX: 900, clientY: 20 });
  expect(screen.getByText("a,b")).toBeTruthy();
  await act(async () => screen.getByRole("link", { name: "a" }).blur());
  expect(screen.getByText("unlocked")).toBeTruthy();
});
