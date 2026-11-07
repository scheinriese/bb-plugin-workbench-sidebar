// @vitest-environment jsdom
import { render, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { installTestPluginRuntime } from "@get-bb/plugin-sdk/testing/app";
import { DotSlot, ProviderActivity } from "./RowSignals.js";
import { threadListIndicatorStateForThread } from "../model/thread-activity.js";
import { makeSidebarThread } from "../model/fixtures.js";
import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
installTestPluginRuntime();
afterEach(cleanup);
const boat: SidebarThreadDto = {
  threadId: "t",
  role: "task",
  status: "needs-you",
  provider: "claude",
  secondLine: { text: "Pick a rate limit", tone: "attention" },
  parentThreadId: null,
  rollup: null,
  createdFor: null,
  listedIn: null,
  hidden: false,
  updatedAt: "2026-11-07T00:00:00Z",
};
const state = threadListIndicatorStateForThread(
  makeSidebarThread({ isUnread: true }),
  false,
);
describe("Workbench signal geometry", () => {
  it.each([false, true])(
    "retains native working signals when provider icons are hidden (draft %s)",
    (draft) => {
      const { container } = render(
        <DotSlot
          state={{
            ...state,
            hasUnreadSuccess: false,
            isRuntimeActive: true,
            hasUnsubmittedDraft: draft,
          }}
          rowStatus={null}
          collapsed={false}
          showNativeActivity
        />,
      );
      expect(
        container.querySelector(".wb-dot-slot")!.childElementCount,
      ).toBeGreaterThan(0);
      expect(
        container.querySelector('path[d="M8.2 1.8l2 2L4 10H2V8l6.2-6.2z"]'),
      ).toBeNull();
    },
  );
  it("renders exact quarter arcs without rotating provider marks", () => {
    const { container } = render(
      <ProviderActivity
        providerId="claude-code"
        working
        review={false}
        done={false}
      />,
    );
    expect(container.querySelector("circle")?.getAttribute("r")).toBe("8");
    expect(container.querySelector("path")?.getAttribute("d")).toBe(
      "M9 1a8 8 0 0 1 8 8",
    );
    expect(container.querySelector("path")?.getAttribute("stroke")).toBe(
      "#D97757",
    );
  });
  it("uses the review quarter arc for Codex", () => {
    const { container } = render(
      <ProviderActivity providerId="codex" working review done={false} />,
    );
    expect(container.querySelector("path")?.getAttribute("d")).toBe(
      "M1 9a8 8 0 0 1 8-8",
    );
    expect(
      container.querySelector("path")?.getAttribute("strokeWidth") ??
        container.querySelector("path")?.getAttribute("stroke-width"),
    ).toBe("1.5");
  });
  it("gives draft pencil priority over Boat attention and unread", () => {
    const { container } = render(
      <DotSlot
        boat={boat}
        state={{ ...state, hasUnsubmittedDraft: true }}
        rowStatus={null}
        collapsed={false}
      />,
    );
    expect(container.querySelector("path")?.getAttribute("d")).toBe(
      "M8.2 1.8l2 2L4 10H2V8l6.2-6.2z",
    );
    expect(container.querySelector(".wb-dot")).toBeNull();
  });
  it("uses one attention dot over unread, and no dot for read ready", () => {
    const { rerender, container } = render(
      <DotSlot boat={boat} state={state} rowStatus={null} collapsed={false} />,
    );
    expect(container.querySelectorAll(".wb-dot")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Needs you" })).toBeTruthy();
    rerender(
      <DotSlot
        boat={{ ...boat, status: "ready" }}
        state={{ ...state, hasUnreadSuccess: false }}
        rowStatus={null}
        collapsed={false}
      />,
    );
    expect(container.querySelector(".wb-dot")).toBeNull();
  });
});
