// @vitest-environment jsdom
import { makeSidebarThread } from "../model/fixtures.js";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import type { PluginThreadListProps } from "@get-bb/plugin-sdk/app";
import { sidebarRpcMethods } from "../../shared/boat-sidebar.js";
import { defaultPreferences } from "../../shared/preferences.js";
import { teamFixture } from "./team-fixtures.js";
import {
  resetPreferencesSyncForTest,
  setPreferencesMirrorStorageForTest,
} from "../preferences/preferences-sync.js";
import { readFileSync } from "node:fs";

const app = await loadPluginApp(() => import("../../app.js"));
afterEach(() => {
  cleanup();
  resetPreferencesSyncForTest();
  setPreferencesMirrorStorageForTest(undefined);
});
async function mount({
  morning = false,
  mobile = false,
  calm = false,
  enabled = true,
  every = false,
  drafts = [] as string[],
  version = 1,
  blockVersion = undefined as number | undefined,
  modify = (_f: ReturnType<typeof teamFixture>) => {},
} = {}) {
  setPreferencesMirrorStorageForTest(null);
  const f = teamFixture(morning ? "09:00" : "14:30");
  modify(f);
  const onNavigate = vi.fn();
  const props: PluginThreadListProps = {
    activeProjectId: null,
    activeThreadId: null,
    isCompactViewport: mobile,
    onNavigate,
    searchQuery: "",
  };
  const rendered = renderSlot(app.threadLists[0]!, props, {
    sidebarDraftThreadIds: drafts,
    sidebarThreads: {
      status: "ready",
      threads: f.threads,
      projects: f.projects,
      sections: [],
    },
    rpc: {
      listPreferences: () => ({
        preferences: {
          ...defaultPreferences(),
          calmFaces: calm,
          showProviderOnEveryRow: every,
        },
      }),
      setPreference: (input) => input,
    },
    sdk: {
      plugins: {
        callRpc: async () =>
          sidebarRpcMethods.sidebarState.output.parse({
            version,
            revision: "fixture",
            threads: f.states,
            truncated: false,
            team: {
              ...f.team,
              enabled,
              ...(blockVersion === undefined ? {} : { version: blockVersion }),
            },
          }) as never,
      },
    },
  });
  await waitFor(() =>
    expect(screen.queryByLabelText("Loading sidebar navigation")).toBeNull(),
  );
  return { ...rendered, onNavigate, f };
}
it.each([true, false])(
  "renders Nora, members and project headers at the two snapshots (morning=%s)",
  async (morning) => {
    const { onNavigate, inspection } = await mount({ morning });
    const count = await screen.findByLabelText(
      `${morning ? 2 : 3} need you. Open Team Today`,
    );
    fireEvent.click(count);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(count.getAttribute("href")).toBe("/plugins/boat/cloud-agents");
    expect(inspection.navigateCalls).toContainEqual({
      method: "toPluginPanel",
      path: "cloud-agents",
      options: { subPath: "" },
    });
    expect(
      document.querySelectorAll('[data-sidebar-thread-id="thr_nora"]'),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll('[data-sidebar-thread-id="thr_iris"]'),
    ).toHaveLength(1);
    expect(screen.getByText(/chief of staff/)).not.toBeNull();
    expect(screen.getByText("in Web app")).not.toBeNull();
    expect(screen.getByText("in Docs site")).not.toBeNull();
    expect(screen.getAllByLabelText("Needs you")).toHaveLength(morning ? 2 : 3);
    expect(screen.getByLabelText("Open Web app lead chat")).not.toBeNull();
    fireEvent.click(screen.getByLabelText("Open Web app lead chat"));
    expect(inspection.navigateCalls).toContainEqual({
      method: "toThread",
      threadId: "thr_web-lead",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse Web app section" }),
    );
    expect(
      document.querySelector('[data-sidebar-thread-id="thr_checkout"]'),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Team/ }));
    expect(
      document.querySelector('[data-sidebar-thread-id="thr_iris"]'),
    ).toBeNull();
  },
);
it("uses calm faces with no Nora orbit and preserves phone navigation", async () => {
  const { onNavigate } = await mount({ mobile: true, calm: true });
  await screen.findByText(/chief of staff/);
  expect(document.querySelector(".wb-team-orbit")).toBeNull();
  expect(
    document.querySelectorAll('[data-system="calm"]').length,
  ).toBeGreaterThan(5);
  fireEvent.click(screen.getByLabelText("Open Nora"));
  expect(onNavigate).toHaveBeenCalledOnce();
});
it("leaves existing generic rows when Team is disabled", async () => {
  await mount({ enabled: false });
  expect(document.querySelector(".wb-team-block")).toBeNull();
  expect(
    document.querySelector('[data-sidebar-thread-id="thr_nora"]'),
  ).not.toBeNull();
});
it("omits provider slots on members by default and opts in to every-row marks", async () => {
  await mount();
  await screen.findByText(/chief of staff/);
  expect(
    document.querySelector(".wb-team-chief [data-sidebar-thread-provider]"),
  ).toBeNull();
  cleanup();
  resetPreferencesSyncForTest();
  await mount({ every: true });
  await screen.findByText(/chief of staff/);
  expect(document.querySelector(".wb-team-chief .wb-provider")).not.toBeNull();
});
it("freezes avatar, orbit, blink and running ring under reduced motion", () => {
  const css = readFileSync("app/workbench/rows.css", "utf8");
  expect(css).toMatch(
    /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.wb-team-avatar \*, \.wb-team-avatar::after, \.wb-your-move span \{ animation: none !important/,
  );
  expect(css).toContain(
    ".wb-team-avatar::after, .wb-your-move span { animation: none !important;",
  );
});

it("shows latest Nora copy and no zero-count pill", async () => {
  await mount({
    modify: (f) => {
      f.team.yourMove.count = 0;
    },
  });
  await screen.findByText(/chief of staff/);
  expect(screen.queryByLabelText(/Open Team Today/)).toBeNull();
  expect(document.querySelector(".wb-team-chief")?.textContent).toContain(
    "The car service is booked for Thursday",
  );
  expect(document.querySelector(".wb-team-chief")?.textContent).not.toContain(
    "Next:",
  );
});
it("adds unread messages and unanswered cards without duplicating ask markers", async () => {
  await mount({
    modify: (f) => {
      f.team.members[4]!.unread = { messages: 2, cards: 1 };
    },
  });
  expect(
    await screen.findByLabelText("2 unread messages, 1 unanswered cards"),
  ).not.toBeNull();
  expect(screen.getAllByLabelText("Needs you")).toHaveLength(3);
});
it("keeps pinned project tasks in Pinned, once", async () => {
  await mount({
    modify: (f) => {
      const task = f.threads.find((t) => t.id === "thr_checkout")!;
      task.isPinned = true;
      task.pinnedAt = 20;
    },
  });
  await screen.findByText(/chief of staff/);
  const row = document.querySelector('[data-sidebar-thread-id="thr_checkout"]');
  expect(
    document.querySelectorAll('[data-sidebar-thread-id="thr_checkout"]'),
  ).toHaveLength(1);
  expect(row?.closest(".wb-team-project")).toBeNull();
});

it("renders project → task → review → sub-thread with native multi-level geometry", async () => {
  await mount({
    modify: (f) => {
      f.threads.push(
        makeSidebarThread({
          id: "thr_review",
          title: "Review checkout",
          projectId: "web",
          parentThreadId: "thr_checkout",
        }),
        makeSidebarThread({
          id: "thr_detail",
          title: "Review detail",
          projectId: "web",
          parentThreadId: "thr_review",
        }),
      );
      f.states.push(
        {
          ...f.states[0]!,
          threadId: "thr_review",
          role: "review",
          provider: "codex",
          status: "review",
          moving: true,
          parentThreadId: "thr_checkout",
        },
        {
          ...f.states[0]!,
          threadId: "thr_detail",
          role: "chat",
          status: "working",
          parentThreadId: "thr_review",
        },
      );
    },
  });
  await screen.findByText("Codex reviewing…");
  const review = document
    .querySelector('[data-sidebar-thread-id="thr_review"]')!
    .closest(".wb-row") as HTMLElement;
  const detail = document
    .querySelector('[data-sidebar-thread-id="thr_detail"]')!
    .closest(".wb-row") as HTMLElement;
  expect(review.style.paddingLeft).toBe("58px");
  expect(detail.style.paddingLeft).toBe("82px");
  expect(review.querySelector(".wb-provider")).not.toBeNull();
});
it("keeps the assignee face and marks a non-default provider from the real thread DTO", async () => {
  await mount({
    modify: (f) => {
      f.states[1]!.provider = "codex";
    },
  });
  await screen.findByText(/chief of staff/);
  const row = document
    .querySelector('[data-sidebar-thread-id="thr_pricing"]')!
    .closest(".wb-row")!;
  expect(row.querySelector(".wb-team-avatar")).not.toBeNull();
  expect(row.querySelector(".wb-provider")).not.toBeNull();
});

it("keeps native draft signals on member rows and the chief tile", async () => {
  await mount({ drafts: ["thr_nora", "thr_scout"] });
  await screen.findByText(/chief of staff/);
  expect(document.querySelector(".wb-chief-draft")?.textContent).toBe("Draft");
  const scout = document
    .querySelector('[data-sidebar-thread-id="thr_scout"]')!
    .closest(".wb-row");
  expect(
    scout?.querySelector('[aria-label="Unsubmitted draft"]'),
  ).not.toBeNull();
});

it("opens the actual chief home from the producer's thread pointer", async () => {
  const { f, onNavigate } = await mount();
  await screen.findByText(/chief of staff/);
  const home = screen.getByLabelText("Open Nora");
  expect(home.getAttribute("data-sidebar-thread-id")).toBe(
    f.team.lead!.threadId,
  );
  expect(home.getAttribute("href")).toBe(
    f.threads.find((t) => t.id === f.team.lead!.threadId)!.href,
  );
  fireEvent.click(home);
  expect(onNavigate).toHaveBeenCalledOnce();
});
it("renders other Team data when the chief home does not exist yet", async () => {
  await mount({
    modify: (f) => {
      f.team.lead = null;
      f.threads.splice(
        f.threads.findIndex((t) => t.id === "thr_nora"),
        1,
      );
      f.team.hideFromSections = f.team.hideFromSections.filter(
        (id) => id !== "thr_nora",
      );
    },
  });
  await screen.findByLabelText("Open Web app lead chat");
  expect(document.querySelector(".wb-chief-tile")).toBeNull();
  expect(
    document.querySelector('[data-sidebar-thread-id="thr_iris"]'),
  ).not.toBeNull();
});
it.each([{ version: 2 }, { blockVersion: 2 }])(
  "restores existing rows for unsupported versions: %j",
  async (options) => {
    await mount(options);
    expect(document.querySelector(".wb-team-block")).toBeNull();
    expect(
      document.querySelector('[data-sidebar-thread-id="thr_nora"]'),
    ).not.toBeNull();
  },
);
it("refreshes an additive Team revision without depending on an outer revision change", async () => {
  const { f } = await mount();
  await screen.findByText(/chief of staff/);
  f.team.yourMove.count = 4;
  f.team.revision = "next-team-revision";
  fireEvent(document, new Event("visibilitychange"));
  await screen.findByLabelText("4 need you. Open Team Today");
});

it("keeps a projectless blocked-task ask on the task instead of duplicating it from the member preview or cards", async () => {
  await mount({
    modify: (f) => {
      const olive = f.team.members.find((m) => m.memberId === "olive")!;
      olive.preview = {
        kind: "needs-you",
        text: "Review the car service details",
        tone: "neutral",
      };
      olive.unread.cards = 1;
      olive.backgroundThreadIds = ["thr_car"];
      f.threads.push(
        makeSidebarThread({
          id: "thr_car",
          title: "Car service details",
          projectId: "personal",
          parentThreadId: olive.threadId,
        }),
      );
      f.states.push({
        ...f.states[0]!,
        threadId: "thr_car",
        parentThreadId: olive.threadId,
        secondLine: { text: olive.preview.text, tone: "attention" },
      });
    },
  });
  await screen.findByText("Car service details");
  const olive = document
    .querySelector('[data-sidebar-thread-id="thr_olive"]')!
    .closest(".wb-row");
  const car = document
    .querySelector('[data-sidebar-thread-id="thr_car"]')!
    .closest(".wb-row");
  expect(olive?.querySelector('[aria-label="Needs you"]')).toBeNull();
  expect(car?.querySelector('[aria-label="Needs you"]')).not.toBeNull();
});
