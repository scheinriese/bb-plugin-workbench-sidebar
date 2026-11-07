// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createRef } from "react";
import { SidebarStickyTier } from "./sidebar.js";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("detects pinning from owned sentinel geometry and releases after scrolling back", async () => {
  let sentinel = 100,
    row = 100;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return new DOMRect(
        4,
        this.classList.contains("wb-sticky-sentinel") ? sentinel : row,
        311,
        28,
      );
    },
  );
  const ref = createRef<HTMLDivElement>();
  render(
    <SidebarStickyTier tier="parent" level={0} ref={ref}>
      Parent
    </SidebarStickyTier>,
  );
  const element = screen.getByText("Parent");
  expect(ref.current).toBe(element);
  expect(element.dataset.workbenchPinned).toBeUndefined();
  sentinel = 20;
  row = 80;
  fireEvent.scroll(window);
  await waitFor(() => expect(element.dataset.workbenchPinned).toBe("true"));
  sentinel = row = 100;
  fireEvent.scroll(window);
  await waitFor(() => expect(element.dataset.workbenchPinned).toBeUndefined());
});
