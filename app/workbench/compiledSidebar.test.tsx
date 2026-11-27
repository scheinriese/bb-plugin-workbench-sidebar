// @vitest-environment jsdom
// Test-only BB host adapter for the public runtimeSlots artifact ABI. Never
// shipped or used by the plugin; all slots are the declared public packages.
import { cleanup, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { createRequire } from "node:module";
import { join } from "node:path";
import { teamFixture } from "./team-fixtures.js";
import { makeSidebarThread } from "../model/fixtures.js";
import { defaultPreferences } from "../../shared/preferences.js";
import {
  resetPreferencesSyncForTest,
  setPreferencesMirrorStorageForTest,
} from "../preferences/preferences-sync.js";
const previousRuntime = Reflect.get(globalThis, "__bbPluginRuntime");
afterEach(() => {
  cleanup();
  resetPreferencesSyncForTest();
  setPreferencesMirrorStorageForTest(undefined);
  if (previousRuntime === undefined)
    Reflect.deleteProperty(globalThis, "__bbPluginRuntime");
  else Reflect.set(globalThis, "__bbPluginRuntime", previousRuntime);
});
it.skipIf(!process.env.WORKBENCH_TEST_BUILT)(
  "smokes the shipped artifact with Team off/on, native chats, disclosures and navigation",
  async () => {
    Reflect.set(globalThis, "__bbPluginRuntime", {
      react: await import("react"),
      jsxRuntime: await import("react/jsx-runtime"),
      reactDom: await import("react-dom"),
      pluginSdkApp: await import("@get-bb/plugin-sdk/app"),
      clsx: await import("clsx"),
      tailwindMerge: await import("tailwind-merge"),
      classVarianceAuthority: await import("class-variance-authority"),
      radixContextMenu: await import("@radix-ui/react-context-menu"),
      radixDialog: await import("@radix-ui/react-dialog"),
      radixDropdownMenu: await import("@radix-ui/react-dropdown-menu"),
      radixTooltip: await import("@radix-ui/react-tooltip"),
      sonner: await import("sonner"),
    });
    const require = createRequire(
      join(process.cwd(), "scripts", "artifact-host.cjs"),
    );
    const app = await loadPluginApp(() => require("../dist/app.js"));
    for (const enabled of [false, true]) {
      setPreferencesMirrorStorageForTest(null);
      const f = teamFixture();
      f.threads.push(
        makeSidebarThread({
          id: "plain-built",
          title: "My plain chat",
          projectId: "web",
        }),
      );
      const result = renderSlot(
        app.threadLists[0]!,
        {
          activeThreadId: null,
          activeProjectId: null,
          isCompactViewport: false,
          onNavigate() {},
          searchQuery: "",
        },
        {
          sidebarThreads: {
            status: "ready",
            threads: f.threads,
            projects: f.projects,
            sections: [],
          },
          rpc: {
            listPreferences: () => ({ preferences: defaultPreferences() }),
            setPreference: (value) => value,
            teamArtwork: () => ({}),
          },
          sdk: {
            plugins: {
              callRpc: async () =>
                ({
                  version: 1,
                  revision: "built",
                  threads: f.states,
                  truncated: false,
                  team: enabled ? f.team : undefined,
                }) as never,
            },
          },
        },
      );
      await screen.findByLabelText("Open My plain chat");
      await waitFor(() =>
        expect(
          screen.queryByLabelText("Loading sidebar navigation"),
        ).toBeNull(),
      );
      expect(
        document
          .querySelector('[data-sidebar-thread-id="plain-built"]')!
          .closest(".wb-team-block"),
      ).toBeNull();
      if (enabled) {
        const count = await screen.findByLabelText(
          "3 need you. Open Team Today",
        );
        fireEvent.click(count);
        expect(result.inspection.navigateCalls).toContainEqual({
          method: "toPluginPanel",
          path: "cloud-agents",
          options: { subPath: "" },
        });
        expect(
          screen.getByLabelText("Open Nora, chief of staff"),
        ).not.toBeNull();
        fireEvent.click(
          screen.getByRole("button", { name: "Collapse Web app section" }),
        );
        expect(
          document.querySelector('[data-sidebar-thread-id="thr_checkout"]'),
        ).toBeNull();
      } else expect(document.querySelector(".wb-team-block")).toBeNull();
      cleanup();
      resetPreferencesSyncForTest();
    }
  },
);
