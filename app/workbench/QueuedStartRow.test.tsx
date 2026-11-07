// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { QueuedStartRow } from "./QueuedStartRow.js";
import type { SidebarQueuedStartDto } from "../../shared/boat-sidebar.js";
const row: SidebarQueuedStartDto = { id: "request", revision: 1, title: "Gift wrap", sourceThreadId: "source", provider: "claude", resetsAt: null, createdAt: "2026-11-07T12:00:00Z", state: "waiting", taskId: null, taskThreadId: null };
afterEach(cleanup);
it("renders a request without thread identity, drag, shortcuts, new, ring or dot and exposes only two request actions", async () => {
  const slot = renderSlot({ component: QueuedStartRow }, { row, depth: 1 });
  const link = screen.getByRole("link");
  expect(link.getAttribute("href")).toBe("/threads/source");
  expect(link.draggable).toBe(false);
  expect(document.querySelector('[data-sidebar-thread-id], [data-sidebar-thread-shortcut-target], [draggable="true"], .wb-ring, .wb-dot, .wb-new-slot')).toBeNull();
  fireEvent.click(link);
  expect(slot.inspection.navigateCalls).toHaveLength(1);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Request actions for Gift wrap" }), { button: 0, ctrlKey: false });
  expect((await screen.findAllByRole("menuitem")).map(item => item.textContent)).toEqual(["Start now", "Cancel request"]);
});
it("keeps a headless started request linked to actual task detail and exposes no request actions", () => {
  renderSlot({ component: QueuedStartRow }, { row: { ...row, state: "started", taskId: "real-task", taskThreadId: null }, depth: 1 });
  expect(screen.getByRole("link").getAttribute("href")).toBe("/plugins/boat/cloud-agents/task/real-task");
  expect(screen.queryByRole("button")).toBeNull();
  expect(document.querySelector('[data-sidebar-thread-id]')).toBeNull();
});
